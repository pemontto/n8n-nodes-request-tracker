import type {
	ILoadOptionsFunctions,
	ResourceMapperFields,
	ResourceMapperField,
	IHttpRequestOptions,
	INodePropertyOptions,
} from 'n8n-workflow';

/** Custom field definition from RT API */
interface CustomFieldDef {
	id: string;
	Name: string;
	Type: string;
	MaxValues?: number;
}

type QueueParam = string | { value?: string; mode?: string } | undefined;

function extractQueueNameOrId(queueParam: QueueParam): string | undefined {
	if (!queueParam) {
		return;
	}

	if (typeof queueParam === 'string') {
		const trimmed = queueParam.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}

	if (typeof queueParam === 'object' && queueParam.value) {
		const trimmed = String(queueParam.value).trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}

	return;
}

/**
 * Resolve queue name to ID if needed
 */
async function resolveQueueId(
	context: ILoadOptionsFunctions,
	queueNameOrId: string,
	baseUrl: string,
	skipSslCertificateValidation: boolean,
): Promise<string> {
	// If it's already a number, return as-is
	if (/^\d+$/.test(queueNameOrId)) {
		return queueNameOrId;
	}

	// Look up queue by name
	console.log('[RT ResourceMapper] Looking up queue by name:', queueNameOrId);
	const requestOptions: IHttpRequestOptions = {
		method: 'GET',
		url: `${baseUrl}/REST/2.0/queue/${encodeURIComponent(queueNameOrId)}`,
		qs: { fields: 'id' },
		json: true,
		skipSslCertificateValidation,
	};

	const response = (await context.helpers.httpRequestWithAuthentication.call(
		context,
		'requestTrackerApi',
		requestOptions,
	)) as { id?: string | number };

	if (response.id) {
		console.log('[RT ResourceMapper] Resolved queue', queueNameOrId, 'to ID:', response.id);
		return String(response.id);
	}

	throw new Error(`Queue not found: ${queueNameOrId}`);
}

/**
 * Get queue ID from a ticket
 */
async function getQueueIdFromTicket(
	context: ILoadOptionsFunctions,
	ticketId: string,
	baseUrl: string,
	skipSslCertificateValidation: boolean,
): Promise<string | null> {
	console.log('[RT ResourceMapper] Fetching queue from ticket:', ticketId);
	const ticketRequest: IHttpRequestOptions = {
		method: 'GET',
		url: `${baseUrl}/REST/2.0/ticket/${ticketId}`,
		qs: { fields: 'Queue' },
		json: true,
		skipSslCertificateValidation,
	};

	const response = (await context.helpers.httpRequestWithAuthentication.call(
		context,
		'requestTrackerApi',
		ticketRequest,
	)) as { Queue?: { id?: number; Name?: string } | string | number };

	if (response.Queue) {
		if (typeof response.Queue === 'object' && response.Queue.id) {
			return String(response.Queue.id);
		} else if (typeof response.Queue === 'number' || typeof response.Queue === 'string') {
			return String(response.Queue);
		}
	}

	return null;
}

/**
 * Fetch global ticket custom fields (used when no queue specified)
 */
async function fetchGlobalCustomFields(
	context: ILoadOptionsFunctions,
	baseUrl: string,
	skipSslCertificateValidation: boolean,
): Promise<CustomFieldDef[]> {
	console.log('[RT ResourceMapper] Fetching global ticket custom fields');

	// First get the list of global ticket custom fields
	const listRequest: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/REST/2.0/customfields`,
		headers: { 'Content-Type': 'application/json' },
		qs: { per_page: 100 },
		body: [
			{ field: 'Disabled', operator: '=', value: '0' },
			{ field: 'LookupType', operator: '=', value: 'RT::Queue-RT::Ticket' },
		],
		json: true,
		skipSslCertificateValidation,
	};

	const listResponse = (await context.helpers.httpRequestWithAuthentication.call(
		context,
		'requestTrackerApi',
		listRequest,
	)) as { items?: Array<{ id: string }> };

	const cfIds = (listResponse.items || []).map((cf) => cf.id);
	console.log('[RT ResourceMapper] Got', cfIds.length, 'global custom field IDs');

	if (cfIds.length === 0) {
		return [];
	}

	// Fetch full details for each custom field in parallel
	const cfPromises = cfIds.map(async (cfId) => {
		try {
			const cfRequest: IHttpRequestOptions = {
				method: 'GET',
				url: `${baseUrl}/REST/2.0/customfield/${cfId}`,
				qs: { fields: 'id,Name,Type,MaxValues,Disabled' },
				json: true,
				skipSslCertificateValidation,
			};
			const cfResponse = (await context.helpers.httpRequestWithAuthentication.call(
				context,
				'requestTrackerApi',
				cfRequest,
			)) as CustomFieldDef & { Disabled?: string };

			if (cfResponse.Disabled !== '1') {
				console.log('[RT ResourceMapper] CF:', cfResponse.Name, 'Type:', cfResponse.Type, 'MaxValues:', cfResponse.MaxValues);
				return cfResponse;
			}
		} catch (err) {
			console.log('[RT ResourceMapper] Error fetching custom field', cfId, err);
		}
		return null;
	});

	const cfResults = await Promise.all(cfPromises);
	return cfResults.filter((cf): cf is CustomFieldDef => cf !== null);
}

/**
 * Fetch custom fields for a queue
 */
async function fetchQueueCustomFields(
	context: ILoadOptionsFunctions,
	queueId: string,
	baseUrl: string,
	skipSslCertificateValidation: boolean,
): Promise<CustomFieldDef[]> {
	// First get the list of custom fields for this queue
	const listRequest: IHttpRequestOptions = {
		method: 'GET',
		url: `${baseUrl}/REST/2.0/queue/${queueId}/customfields`,
		qs: { per_page: 100 },
		json: true,
		skipSslCertificateValidation,
	};

	console.log('[RT ResourceMapper] Fetching custom fields from:', listRequest.url);

	const listResponse = (await context.helpers.httpRequestWithAuthentication.call(
		context,
		'requestTrackerApi',
		listRequest,
	)) as { items?: Array<{ id: string }> };

	const cfIds = (listResponse.items || []).map((cf) => cf.id);
	console.log('[RT ResourceMapper] Got', cfIds.length, 'custom field IDs for queue');

	if (cfIds.length === 0) {
		return [];
	}

	// Fetch full details for each custom field in parallel
	const cfPromises = cfIds.map(async (cfId) => {
		try {
			const cfRequest: IHttpRequestOptions = {
				method: 'GET',
				url: `${baseUrl}/REST/2.0/customfield/${cfId}`,
				qs: { fields: 'id,Name,Type,MaxValues,Disabled' },
				json: true,
				skipSslCertificateValidation,
			};
			const cfResponse = (await context.helpers.httpRequestWithAuthentication.call(
				context,
				'requestTrackerApi',
				cfRequest,
			)) as CustomFieldDef & { Disabled?: string };

			if (cfResponse.Disabled !== '1') {
				console.log('[RT ResourceMapper] CF:', cfResponse.Name, 'Type:', cfResponse.Type, 'MaxValues:', cfResponse.MaxValues);
				return cfResponse;
			}
		} catch (err) {
			console.log('[RT ResourceMapper] Error fetching custom field', cfId, err);
		}
		return null;
	});

	const cfResults = await Promise.all(cfPromises);
	return cfResults.filter((cf): cf is CustomFieldDef => cf !== null);
}

/**
 * Fetch options for Select-type custom fields in parallel
 */
async function fetchSelectFieldOptions(
	context: ILoadOptionsFunctions,
	customFields: CustomFieldDef[],
	baseUrl: string,
	skipSslCertificateValidation: boolean,
): Promise<Map<string, INodePropertyOptions[]>> {
	const selectFields = customFields.filter((cf) => cf.Type === 'Select');
	console.log('[RT ResourceMapper] Fetching options for', selectFields.length, 'Select fields');

	const optionsMap = new Map<string, INodePropertyOptions[]>();
	if (selectFields.length === 0) {
		return optionsMap;
	}

	const optionsPromises = selectFields.map(async (cf) => {
		try {
			const valuesRequest: IHttpRequestOptions = {
				method: 'GET',
				url: `${baseUrl}/REST/2.0/customfield/${cf.id}/values`,
				qs: { per_page: 200 },
				json: true,
				skipSslCertificateValidation,
			};
			const valuesResponse = (await context.helpers.httpRequestWithAuthentication.call(
				context,
				'requestTrackerApi',
				valuesRequest,
			)) as { items?: Array<{ name?: string; Name?: string }> };

			if (valuesResponse.items && valuesResponse.items.length > 0) {
				const parsedOptions: INodePropertyOptions[] = [];
				for (const item of valuesResponse.items) {
					const label = item.name || item.Name;
					if (label) {
						parsedOptions.push({ name: label, value: label });
					}
				}
				if (parsedOptions.length > 0) {
					return { fieldName: cf.Name, options: parsedOptions };
				}
			}
		} catch (err) {
			console.log('[RT ResourceMapper] Error fetching values for', cf.Name, err);
		}
		return { fieldName: cf.Name, options: [] as INodePropertyOptions[] };
	});

	const results = await Promise.all(optionsPromises);
	for (const result of results) {
		if (result.options.length > 0) {
			optionsMap.set(result.fieldName, result.options);
		}
	}

	return optionsMap;
}

/**
 * Build ResourceMapperField array from custom fields and their options
 */
function buildResourceMapperFields(
	customFields: CustomFieldDef[],
	optionsMap: Map<string, INodePropertyOptions[]>,
): ResourceMapperField[] {
	const fields: ResourceMapperField[] = [];

	for (const cf of customFields) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let fieldType: any = 'string';
		let options: INodePropertyOptions[] | undefined;

		// MaxValues: 0 = unlimited, 1 = single value, >1 = limited multi-value
		// API returns MaxValues as string, so convert to number
		// Only relevant for Select fields
		const maxValues = cf.MaxValues !== undefined ? Number(cf.MaxValues) : 1;
		const isMultiValue = cf.Type === 'Select' && (maxValues === 0 || maxValues > 1);

		if (cf.Type === 'Select') {
			options = optionsMap.get(cf.Name);
			if (options && options.length > 0) {
				// Note: n8n ResourceMapper doesn't support multiOptions properly
				// (clicking options doesn't select them). Use 'options' for all Select fields.
				// For multi-value fields, users can use Expression mode with an array like ["value1", "value2"]
				// See: https://community.n8n.io/t/multiple-options-in-resource-mapper/30727
				fieldType = 'options';
			}
		} else if (cf.Type === 'Date' || cf.Type === 'DateTime') {
			fieldType = 'dateTime';
		} else if (cf.Type === 'Integer') {
			fieldType = 'number';
		}

		// Add (multi) to display name for multi-value Select fields
		const displayName = isMultiValue ? `${cf.Name} (multi)` : cf.Name;
		console.log('[RT ResourceMapper] Building field:', cf.Name, 'MaxValues:', cf.MaxValues, 'isMultiValue:', isMultiValue, 'displayName:', displayName, 'type:', fieldType);

		const field: ResourceMapperField = {
			id: cf.Name,
			displayName: displayName,
			type: fieldType,
			required: false,
			display: true,
			defaultMatch: false,
			canBeUsedToMatch: false,
		};

		if (options && options.length > 0) {
			field.options = options;
		}

		fields.push(field);
	}

	return fields;
}

/**
 * Main function to get custom fields for a queue
 */
async function getCustomFieldsForQueue(
	context: ILoadOptionsFunctions,
	queueNameOrId: string,
	baseUrl: string,
	skipSslCertificateValidation: boolean,
): Promise<ResourceMapperField[]> {
	// Resolve queue name to ID if needed
	const queueId = await resolveQueueId(context, queueNameOrId, baseUrl, skipSslCertificateValidation);

	// Fetch custom fields for the queue
	const customFields = await fetchQueueCustomFields(context, queueId, baseUrl, skipSslCertificateValidation);

	if (customFields.length === 0) {
		return [];
	}

	console.log('[RT ResourceMapper] Custom field names:', customFields.map((cf) => cf.Name).join(', '));

	// Fetch options for Select fields
	const optionsMap = await fetchSelectFieldOptions(context, customFields, baseUrl, skipSslCertificateValidation);

	// Build and return fields
	return buildResourceMapperFields(customFields, optionsMap);
}

/**
 * Get global custom fields (when no queue specified)
 */
async function getGlobalCustomFields(
	context: ILoadOptionsFunctions,
	baseUrl: string,
	skipSslCertificateValidation: boolean,
): Promise<ResourceMapperField[]> {
	const customFields = await fetchGlobalCustomFields(context, baseUrl, skipSslCertificateValidation);

	if (customFields.length === 0) {
		return [];
	}

	console.log('[RT ResourceMapper] Global custom field names:', customFields.map((cf) => cf.Name).join(', '));

	// Fetch options for Select fields
	const optionsMap = await fetchSelectFieldOptions(context, customFields, baseUrl, skipSslCertificateValidation);

	// Build and return fields
	return buildResourceMapperFields(customFields, optionsMap);
}

/**
 * Resource mapping for custom fields
 */
export const resourceMapping = {
	async getMappingColumns(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
		console.log('[RT ResourceMapper] getMappingColumns called');

		try {
			const credentials = await this.getCredentials('requestTrackerApi');
			const baseUrl = (credentials.rtInstanceUrl as string).replace(/\/$/, '');
			const skipSslCertificateValidation = credentials.allowUnauthorizedCerts === true;

			let operation: string | undefined;
			try {
				operation = this.getNodeParameter('operation', 0) as string;
			} catch {
				// Operation parameter may not exist yet
			}

			console.log('[RT ResourceMapper] Operation:', operation);

			let queueId: string | undefined;

			if (operation === 'update') {
				// For update: prefer the queue being set, otherwise fall back to the ticket's current queue
				try {
					const updateQueueParam = this.getNodeParameter('updateFields.queue', 0, undefined) as QueueParam;
					queueId = extractQueueNameOrId(updateQueueParam);
					if (queueId) {
						console.log('[RT ResourceMapper] Using queue from updateFields:', queueId);
					}
				} catch {
					// updateFields.queue not available
				}

				if (!queueId) {
					let ticketId: string | undefined;
					try {
						const ticketIdParam = this.getNodeParameter('ticketId', 0);
						ticketId = ticketIdParam ? String(ticketIdParam).trim() : undefined;
					} catch {
						// ticketId not available
					}

					if (ticketId) {
						try {
							const ticketQueueId = await getQueueIdFromTicket(
								this,
								ticketId,
								baseUrl,
								skipSslCertificateValidation,
							);
							if (ticketQueueId) {
								queueId = ticketQueueId;
								console.log('[RT ResourceMapper] Got queue ID from ticket:', queueId);
							}
						} catch (err) {
							console.log('[RT ResourceMapper] Error getting queue from ticket:', err);
						}
					}
				}
			} else {
				// For create: get queue from parameter
				try {
					const queueParam = this.getNodeParameter('queue', 0, undefined) as QueueParam;
					queueId = extractQueueNameOrId(queueParam);
				} catch {
					// Queue parameter may not exist
				}
			}

			let fields: ResourceMapperField[];

			if (queueId) {
				// Get custom fields for the specific queue
				fields = await getCustomFieldsForQueue(this, queueId, baseUrl, skipSslCertificateValidation);
			} else {
				// No queue specified - get global custom fields
				console.log('[RT ResourceMapper] No queue specified, fetching global custom fields');
				fields = await getGlobalCustomFields(this, baseUrl, skipSslCertificateValidation);
			}

			console.log('[RT ResourceMapper] Returning', fields.length, 'fields');
			return { fields };
		} catch (error) {
			console.error('[RT ResourceMapper] Error:', error);
			return { fields: [] };
		}
	},
};
