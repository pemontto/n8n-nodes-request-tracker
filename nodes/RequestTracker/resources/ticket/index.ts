import type { INodeProperties } from 'n8n-workflow';
import { ticketGetDescription } from './get';
import { ticketCreateDescription } from './create';
import { ticketUpdateDescription } from './update';
import { ticketCommentDescription, ticketCorrespondDescription } from './comment';
import { ticketSearchDescription } from './search';
import { ticketGetHistoryDescription } from './getHistory';
import {
	transformTicketData,
	handleRtApiError,
	processTicketHistory,
	mergeCustomFieldsPreSend,
	transformOperationResponse,
	buildRequestBodyPreSend,
	buildFieldsQueryParams,
	debugPreSendRequest,
} from '../../GenericFunctions';

const showOnlyForTicket = {
	resource: ['ticket'],
};

export const ticketDescription: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'hidden',
		default: 'ticket',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForTicket,
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a ticket',
				description: 'Create a new ticket',
				routing: {
					request: {
						method: 'POST',
						url: '/ticket',
					},
					send: {
						preSend: [buildRequestBodyPreSend, mergeCustomFieldsPreSend, debugPreSendRequest],
					},
					output: {
						postReceive: [
							handleRtApiError,
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a ticket',
				description: 'Get a single ticket by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/ticket/{{$parameter.ticketId}}',
					},
					send: {
						preSend: [buildFieldsQueryParams],
					},
					output: {
						postReceive: [
							handleRtApiError,
							transformTicketData,
						],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a ticket',
				description: 'Update a ticket\'s metadata',
				routing: {
					request: {
						method: 'PUT',
						url: '=/ticket/{{$parameter.ticketId}}',
					},
					send: {
						preSend: [buildRequestBodyPreSend, mergeCustomFieldsPreSend, debugPreSendRequest],
					},
					output: {
						postReceive: [
							handleRtApiError,
							transformOperationResponse,
						],
					},
				},
			},
			{
				name: 'Add Comment',
				value: 'addComment',
				action: 'Add a comment to ticket',
				description: 'Add an internal comment to a ticket',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'POST',
						url: '=/ticket/{{$parameter.ticketId}}/comment',
					},
					send: {
						preSend: [buildRequestBodyPreSend, mergeCustomFieldsPreSend, debugPreSendRequest],
					},
					output: {
						postReceive: [
							handleRtApiError,
							transformOperationResponse,
						],
					},
				},
			},
			{
				name: 'Add Correspondence',
				value: 'addCorrespondence',
				action: 'Add correspondence to ticket',
				description: 'Add external correspondence (reply) to a ticket',
				routing: {
					request: {
						method: 'POST',
						url: '=/ticket/{{$parameter.ticketId}}/correspond',
					},
					send: {
						preSend: [buildRequestBodyPreSend, mergeCustomFieldsPreSend, debugPreSendRequest],
					},
					output: {
						postReceive: [
							handleRtApiError,
							transformOperationResponse,
						],
					},
				},
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search tickets',
				description: 'Search for tickets using TicketSQL, simple search, or saved searches',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'POST',
						url: '/tickets',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						qs: {
							per_page: '={{ Math.min($parameter.limit || 100, 100) }}',
							orderby: '={{$parameter.additionalOptions?.orderby || "id"}}',
							order: '={{$parameter.additionalOptions?.order || "ASC"}}',
							find_disabled_rows: '={{$parameter.additionalOptions?.find_disabled_rows ? "1" : ""}}',
						},
						body: {
							query: '={{$parameter.searchType === "ticketSQL" ? $parameter.query : ($parameter.searchType === "simple" ? $parameter.simpleQuery : "")}}',
						}
					},
					output: {
						maxResults: '={{ $parameter.limit }}',
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'items',
								},
							},
							handleRtApiError,
							transformTicketData,
						],
					},
					send: {
						preSend: [buildFieldsQueryParams],
						paginate: '={{ $parameter.returnAll || $parameter.limit > 100 }}',
					},
					operations: {
						pagination: {
							type: 'generic',
							properties: {
								continue: '={{ !!$response.body.next_page && $response.body.items.length && ($parameter.returnAll || $response.body.page * $response.body.per_page < $parameter.limit) }}',
								request: {
									url: '={{ $request.url }}?page={{ ($response.body?.page || 0) + 1 }}',
								},
							},
						},
					},
				},
			},
			{
				name: 'Get History',
				value: 'getHistory',
				action: 'Get ticket history',
				description: 'Get ticket history/transactions with filtering options for transaction types and attachment content',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'POST',
						url: '=/ticket/{{$parameter.ticketId}}/history',
						qs: {
							per_page: '={{$parameter.returnAll ? 100 : Math.min($parameter.limit || 100, 100)}}',
							order: '={{$parameter.additionalOptions?.order || "DESC"}}',
							orderby: '={{$parameter.additionalOptions?.orderby || "Created"}}',
						},
						body: '={{ [...($parameter.transactionTypes || []).map(type => ({ field: "Type", operator: "=", value: type, entry_aggregator: "OR" })), ...($parameter.additionalOptions?.createdAfter ? [{ field: "Created", operator: ">", value: $parameter.additionalOptions.createdAfter, entry_aggregator: "AND" }] : []), ...($parameter.additionalOptions?.createdBefore ? [{ field: "Created", operator: "<", value: $parameter.additionalOptions.createdBefore, entry_aggregator: "AND" }] : [])] }}',
					},
					output: {
						maxResults: '={{ $parameter.limit }}',
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'items',
								},
							},
							handleRtApiError,
							processTicketHistory,
						],
					},
					send: {
						preSend: [buildFieldsQueryParams],
						paginate: '={{ $parameter.returnAll || $parameter.limit > 100 }}',
					},
					operations: {
						pagination: {
							type: 'generic',
							properties: {
								continue: '={{ !!$response.body.next_page && $response.body.items.length && ($parameter.returnAll || $response.body.page * $response.body.per_page < $parameter.limit) }}',
								request: {
									url: '={{ $request.url }}?page={{ ($response.body?.page || 0) + 1 }}',
								},
							},
						},
					},
				},
			},
		],
		default: 'get',
	},
	...ticketGetDescription,
	...ticketCreateDescription,
	...ticketUpdateDescription,
	...ticketCommentDescription,
	...ticketCorrespondDescription,
	...ticketSearchDescription,
	...ticketGetHistoryDescription,
];
