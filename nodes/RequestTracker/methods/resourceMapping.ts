import type {
	ILoadOptionsFunctions,
	ResourceMapperFields,
	ResourceMapperField,
	IHttpRequestOptions,
} from 'n8n-workflow';

/**
 * Helper function to fetch values for Select/Combobox custom fields
 */
async function fetchCustomFieldValues(
	context: ILoadOptionsFunctions,
	customFieldId: string,
	baseUrl: string,
	skipSslCertificateValidation: boolean,
): Promise<Array<{ name: string; value: string }>> {
	const requestOptions: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/REST/2.0/customfield/${customFieldId}/values`,
		headers: {
			'Content-Type': 'application/json',
		},
		qs: {
			per_page: 100, // Most custom fields won't have more than 100 values
			fields: 'id,Name,Description,SortOrder',
		},
		body: [
			// Get all values (no filter)
			{ field: 'id', operator: '>', value: '0' },
		],
		json: true,
		skipSslCertificateValidation,
	};

	const response = (await context.helpers.httpRequestWithAuthentication.call(
		context,
		'requestTrackerApi',
		requestOptions,
	)) as {
		items: Array<{
			id: string;
			Name: string;
			Description?: string;
			SortOrder?: number;
		}>;
	};

	// Transform to options format expected by resourceMapper
	// Sort by SortOrder if available
	const items = response.items || [];
	items.sort((a, b) => {
		const orderA = a.SortOrder ?? 999999;
		const orderB = b.SortOrder ?? 999999;
		return orderA - orderB;
	});

	return items.map((value) => ({
		name: value.Name,
		value: value.Name, // RT uses the Name as the value when setting custom fields
	}));
}

export const resourceMapping = {
	/**
	 * Get custom fields for resource mapper
	 * Implements context-aware loading:
	 * - If Queue parameter is set: Fetch queue-specific custom fields
	 * - Otherwise: Fetch all custom fields (fallback)
	 *
	 * For Select/Combobox fields, also fetches possible values from RT
	 */
	async getMappingColumns(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
		try {
			// Get credentials to build base URL and TLS settings
			const credentials = await this.getCredentials('requestTrackerApi');
			const baseUrl = (credentials.rtInstanceUrl as string).replace(/\/$/, '');
			const skipSslCertificateValidation = credentials.allowUnauthorizedCerts === true;

			// Determine endpoint based on Queue parameter
			let endpoint = '/customfields';
			let queueId: string | undefined;

			// Try to get queue parameter - it might be in different formats
			try {
				const queueParam = this.getNodeParameter('queue', 0, undefined) as
				| string
				| { value: string }
				| undefined;
				if (queueParam) {
					// Handle resourceLocator format
					if (typeof queueParam === 'object' && queueParam.value) {
						queueId = queueParam.value;
					} else if (typeof queueParam === 'string') {
						queueId = queueParam;
					}
				}
			} catch {
				// Queue parameter not available - will use fallback endpoint
				console.log('[Custom Fields] Queue parameter not available, using fallback endpoint');
			}

			// Use queue-specific endpoint if queue is available
			if (queueId) {
				endpoint = `/queue/${queueId}/customfields`;
				console.log(`[Custom Fields] Using queue-specific endpoint: ${endpoint}`);
			} else {
				console.log('[Custom Fields] Using global custom fields endpoint');
			}

			// Fetch custom fields from RT API
			const requestOptions: IHttpRequestOptions = {
				method: 'POST',
				url: `${baseUrl}/REST/2.0${endpoint}`,
				headers: {
					'Content-Type': 'application/json',
				},
				qs: {
					per_page: 100, // Get all custom fields (usually not many)
					fields: 'id,Name,Type,Description,MaxValues,Disabled,LookupType,EntryHint,Pattern',
				},
				body: [
					// Only get enabled custom fields
					{ field: 'Disabled', operator: '=', value: '0' },
				],
				json: true,
				skipSslCertificateValidation,
			};

			const response = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				'requestTrackerApi',
				requestOptions,
			)) as {
				items: Array<{
					id: string;
					Name: string;
					Type: string;
					Description?: string;
					MaxValues?: number;
					Disabled?: number;
					LookupType?: string;
					EntryHint?: string;
					Pattern?: string;
				}>;
			};

			console.log(
				`[Custom Fields] Fetched ${response.items?.length || 0} custom fields from ${endpoint}`,
			);

			// Transform RT custom fields to ResourceMapperFields format
			const fields: ResourceMapperField[] = await Promise.all(
				(response.items || []).map(async (field) => {
					// Map RT custom field types to n8n resourceMapper types
					let mappedType: ResourceMapperField['type'] = 'string';
					let options: Array<{ name: string; value: string }> | undefined;

					switch (field.Type) {
						case 'Date':
						case 'DateTime':
							mappedType = 'dateTime';
							break;
						case 'Integer':
							mappedType = 'number';
							break;
						case 'Select':
						case 'Combobox':
							mappedType = 'string';
							// Fetch possible values for Select/Combobox fields
							try {
								options = await fetchCustomFieldValues(
									this,
									field.id,
									baseUrl,
									skipSslCertificateValidation,
								);
								console.log(
									`[Custom Fields] Fetched ${options?.length || 0} values for ${field.Name}`,
								);
							} catch (error) {
								console.error(
									`[Custom Fields] Error fetching values for ${field.Name}:`,
									error,
								);
								// Continue without options if fetch fails
							}
							break;
						case 'Text':
						case 'Wikitext':
						case 'HTML':
						case 'Freeform':
						default:
							mappedType = 'string';
							break;
					}

					const resourceField: ResourceMapperField = {
						id: field.Name, // Use field name as ID (this is how RT references custom fields)
						displayName: field.Name,
						type: mappedType,
						required: false, // RT custom fields are typically optional
						canBeUsedToMatch: false, // Custom fields are not typically used for matching/updating
						defaultMatch: false, // Custom fields are not used for default matching
						display: true, // Always display custom fields
					};

					// Add options for Select/Combobox fields
					if (options && options.length > 0) {
						resourceField.options = options;
					}

					return resourceField;
				}),
			);

			return { fields };
		} catch (error) {
			console.error('[Custom Fields] Error fetching custom fields:', error);
			// Return empty fields on error - better UX than throwing
			return { fields: [] };
		}
	},
};
