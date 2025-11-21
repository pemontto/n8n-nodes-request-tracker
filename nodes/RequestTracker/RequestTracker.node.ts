import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type INodeProperties,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeListSearchResult,
	type INodeListSearchItems,
	type IHttpRequestOptions,
} from 'n8n-workflow';
import { ticketDescription } from './resources/ticket';
import { transactionDescription } from './resources/transaction';
import { attachmentDescription } from './resources/attachment';
import { userDescription } from './resources/user';
import { queueDescription } from './resources/queue';
import { debugPostReceiveResponse, debugPreSendRequest } from './GenericFunctions';
import { resourceMapping } from './methods/resourceMapping';

export class RequestTracker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Request Tracker',
		name: 'requestTracker',
		icon: { light: 'file:../../icons/request-tracker.svg', dark: 'file:../../icons/request-tracker.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Request Tracker REST2 API',
		defaults: {
			name: 'Request Tracker',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'requestTrackerApi',
				required: true,
			},
		],
		requestDefaults: {
			// Ensure no trailing slash on rtInstanceUrl, then append REST/2.0
			baseURL: '={{$credentials.rtInstanceUrl.replace(/\\/$/, "")}}/REST/2.0',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			skipSslCertificateValidation: '={{$credentials.allowUnauthorizedCerts}}',
		},
		properties: [
			{
				displayName: 'Debug',
				name: 'nodeDebug',
				type: 'boolean',
				isNodeSetting: true,
				default: false,
				noDataExpression: true,
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Attachment',
						value: 'attachment',
					},
					{
						name: 'Queue',
						value: 'queue',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
					{
						name: 'Transaction',
						value: 'transaction',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'ticket',
				routing: {
					request: {
						skipSslCertificateValidation: '={{ $credentials.allowUnauthorizedCerts }}',
					},
					send: {
						preSend: [debugPreSendRequest],
					},
					output: {
						postReceive: [debugPostReceiveResponse],
					}
				}
			},
			// Operations and fields for Resource: Attachment
			...attachmentDescription as INodeProperties[],
			// Operations and fields for Resource: Queue
			...queueDescription as INodeProperties[],
			// Operations and fields for Resource: Ticket
			...ticketDescription as INodeProperties[],
			// Operations and fields for Resource: Transaction
			...transactionDescription as INodeProperties[],
			// Operations and fields for Resource: User
			...userDescription as INodeProperties[],
		],
	};

	methods = {
		loadOptions: {
			// Get list of statuses for dropdown
			async getStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// RT standard statuses - these are the default lifecycle statuses
				// Note: In future, we could make this context-aware by fetching from queue's lifecycle
				const statuses = [
					{ name: 'New', value: 'new' },
					{ name: 'Open', value: 'open' },
					{ name: 'Stalled', value: 'stalled' },
					{ name: 'Resolved', value: 'resolved' },
					{ name: 'Rejected', value: 'rejected' },
					{ name: 'Deleted', value: 'deleted' },
				];
				return statuses;
			},
		},
		resourceMapping,
		listSearch: {
			// Search for queues by name
			async searchQueues(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				try {
					const page = paginationToken ? parseInt(paginationToken as string, 10) : 1;
					const perPage = 50;

					// Get credentials to build base URL and TLS settings
					const credentials = await this.getCredentials('requestTrackerApi');
					const baseUrl = (credentials.rtInstanceUrl as string).replace(/\/$/, '');
					const skipSslCertificateValidation = credentials.allowUnauthorizedCerts === true;

					// Build request body - RT API expects JSON array, not form-urlencoded
					let body;
					if (filter && filter.trim()) {
						// LIKE operator needs explicit wildcards for partial matching
						// Search both Name and Description fields with OR logic
						const searchValue = `${filter}`;
						body = [
							{ field: 'Name', operator: 'LIKE', value: searchValue, entry_aggregator: 'OR' },
							{ field: 'Description', operator: 'LIKE', value: searchValue, entry_aggregator: 'OR' },
						];
						console.log('[Queue Search] Filter:', filter, 'Query:', JSON.stringify(body));
					} else {
						// Fallback: get all queues with id > 0
						body = [{ field: 'id', operator: '>', value: '0' }];
						console.log('[Queue Search] No filter - fetching all queues');
					}

					const requestOptions: IHttpRequestOptions = {
						method: 'POST',
						url: `${baseUrl}/REST/2.0/queues`,
						headers: {
							'Content-Type': 'application/json',
						},
						qs: {
							page,
							per_page: perPage,
							fields: 'id,Name,Description',
						},
						body,
						json: true,
						skipSslCertificateValidation,
					};

					// Make API request
					const response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'requestTrackerApi',
						requestOptions,
					)) as { items: Array<{ id: string; Name: string; Description?: string }>; page: number; per_page: number; total: number; count?: number };

					console.log('[Queue Search] Response count:', response.count || response.items?.length || 0, 'Total:', response.total);

					const results: INodeListSearchItems[] = (response.items || []).map((queue) => ({
						name: queue.Name,
						value: queue.id,
						description: queue.Description || undefined,
					}));

					// Calculate if there are more pages
					const hasMore = response.page * response.per_page < response.total;

					return {
						results,
						paginationToken: hasMore ? String(page + 1) : undefined,
					};
				} catch (error) {
					console.error('[Queue Search] Error:', error);
					throw error;
				}
			},

			// Search for users by name or email
			async searchUsers(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				try {
					const page = paginationToken ? parseInt(paginationToken as string, 10) : 1;
					const perPage = 50;

					// Get credentials to build base URL and TLS settings
					const credentials = await this.getCredentials('requestTrackerApi');
					const baseUrl = (credentials.rtInstanceUrl as string).replace(/\/$/, '');
					const skipSslCertificateValidation = credentials.allowUnauthorizedCerts === true;

					// Build request body - RT API expects JSON array, not form-urlencoded
					let body;
					if (filter && filter.trim()) {
						// LIKE operator needs explicit wildcards for partial matching
						// RT API doesn't properly handle OR logic, so we search different fields based on input
						const searchValue = `${filter}`;

						if (filter.includes('@')) {
							// Email search - only search EmailAddress field
							body = [{ field: 'EmailAddress', operator: 'LIKE', value: searchValue }];
							console.log('[User Search] Email search:', filter);
						} else if (filter.includes(' ')) {
							// Full name search - only search RealName field
							body = [{ field: 'RealName', operator: 'LIKE', value: searchValue }];
							console.log('[User Search] RealName search:', filter);
						} else {
							// Username search - only search Name field
							body = [{ field: 'Name', operator: 'LIKE', value: searchValue }];
							console.log('[User Search] Username search:', filter);
						}
					} else {
						// Fallback: get all users with id > 0
						body = [{ field: 'id', operator: '>', value: '0' }];
						console.log('[User Search] No filter - fetching all users');
					}

					const requestOptions: IHttpRequestOptions = {
						method: 'POST',
						url: `${baseUrl}/REST/2.0/users`,
						headers: {
							'Content-Type': 'application/json',
						},
						qs: {
							page,
							per_page: perPage,
							fields: 'id,Name,EmailAddress,RealName',
						},
						body,
						json: true,
						skipSslCertificateValidation,
					};

					// Make API request
					const response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'requestTrackerApi',
						requestOptions,
					)) as { items: Array<{ id: string; Name: string; EmailAddress?: string; RealName?: string }>; page: number; per_page: number; total: number; count?: number };

					console.log('[User Search] Response count:', response.count || response.items?.length || 0, 'Total:', response.total);

					const results: INodeListSearchItems[] = (response.items || []).map((user) => {
						const displayName = `${user.RealName || user.Name} (${user.EmailAddress})`;
						const description = user.EmailAddress ? `${user.EmailAddress}` : undefined;

						return {
							name: displayName,
							value: user.Name, // Use Name (username) as value, not numeric id
							description,
						};
					});

					// Calculate if there are more pages
					const hasMore = response.page * response.per_page < response.total;

					return {
						results,
						paginationToken: hasMore ? String(page + 1) : undefined,
					};
				} catch (error) {
					console.error('[User Search] Error:', error);
					throw error;
				}
			},
		},
	};
}