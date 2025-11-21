import type {
	ILoadOptionsFunctions,
	ResourceMapperFields,
	ResourceMapperField,
	IHttpRequestOptions,
} from 'n8n-workflow';

/**
 * Helper function to fetch values for Select/Combobox custom fields
 */
/* Removed value fetching for performance: Select/Combobox values are no longer retrieved */

export const resourceMapping = {
	/**
	 * Get custom fields for resource mapper
	 * Implements context-aware loading:
	 * - If Queue parameter is set: Fetch queue-specific custom fields
	 * - Otherwise: Fetch all custom fields (fallback)
	 *
	 * Select/Combobox fields are rendered as plain text inputs for performance
	 */
	async getMappingColumns(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
		try {
			// Get credentials to build base URL and TLS settings
			const credentials = await this.getCredentials('requestTrackerApi');
			const baseUrl = (credentials.rtInstanceUrl as string).replace(/\/$/, '');
			const skipSslCertificateValidation = credentials.allowUnauthorizedCerts === true;

			// Determine endpoint based on Queue parameter or ticket context
			let endpoint = '/customfields';
			let queueId: string | undefined;

			// 1) Create op: Queue at top-level
			try {
				const queueParam = this.getNodeParameter('queue', 0, undefined) as
					| string
					| { value?: string }
					| undefined;
				if (queueParam) {
					if (typeof queueParam === 'object' && queueParam.value) {
						queueId = String(queueParam.value);
					} else if (typeof queueParam === 'string') {
						queueId = queueParam;
					}
				}
			} catch {
				// Queue parameter may not exist in this operation context - ignore
				void 0;
			}

			// 2) Update op: Queue inside updateFields
			if (!queueId) {
				try {
					const updateQueueParam = this.getNodeParameter('updateFields.queue', 0, undefined) as
						| string
						| { value?: string }
						| undefined;
					if (updateQueueParam) {
						if (typeof updateQueueParam === 'object' && updateQueueParam.value) {
							queueId = String(updateQueueParam.value);
						} else if (typeof updateQueueParam === 'string') {
							queueId = updateQueueParam;
						}
					}
				} catch {
					// updateFields may not be present (e.g., create op) - ignore
					void 0;
				}
			}

			// 3) If no explicit queue but ticketId present, fetch the ticket to resolve its Queue
			if (!queueId) {
				try {
					const ticketId = this.getNodeParameter('ticketId', 0, undefined) as string | undefined;
					if (ticketId && String(ticketId).trim().length > 0) {
						const requestOptions: IHttpRequestOptions = {
							method: 'GET',
							url: `${baseUrl}/REST/2.0/ticket/${ticketId}`,
							qs: {
								fields: 'Queue',
								'fields[Queue]': 'id,Name',
							},
							json: true,
							skipSslCertificateValidation,
						};
						const ticketResponse = (await this.helpers.httpRequestWithAuthentication.call(
							this,
							'requestTrackerApi',
							requestOptions,
						)) as { Queue?: { id?: string | number; Name?: string } | string | number };

						if (ticketResponse && ticketResponse.Queue) {
							if (typeof ticketResponse.Queue === 'object') {
								if (ticketResponse.Queue.id !== undefined) {
									queueId = String(ticketResponse.Queue.id);
								} else if (ticketResponse.Queue.Name) {
									queueId = String(ticketResponse.Queue.Name);
								}
							} else {
								queueId = String(ticketResponse.Queue);
							}
						}
					}
				} catch {
					// Ignore resolution errors; fallback to global custom fields
				}
			}

			// Use queue-specific endpoint if queue is available; otherwise, return no fields to avoid fetching all
			if (queueId) {
				endpoint = `/queue/${queueId}/customfields`;
			} else {
				// No queue context yet (e.g., first open) - do not fetch global custom fields
				return { fields: [] };
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

			// Transform RT custom fields to ResourceMapperFields format
			const fields: ResourceMapperField[] = await Promise.all(
				(response.items || []).map(async (field) => {
					// Map RT custom field types to n8n resourceMapper types
					let mappedType: ResourceMapperField['type'] = 'string';
					/* options removed for performance */

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
							// Do not fetch allowed values; render as plain string input for speed
							mappedType = 'string';
							// No options attached
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

					/* No options attached for Select/Combobox fields */

					return resourceField;
				}),
			);

			return { fields };
		} catch {
			// Return empty fields on error - better UX than throwing
			return { fields: [] };
		}
	},
};
