import type { INodeProperties } from 'n8n-workflow';
import { TRANSACTION_TYPE_OPTIONS } from '../../GenericFunctions';

export const ticketGetHistoryDescription: INodeProperties[] = [
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '12345',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getHistory'],
			},
		},
		description: 'The ID of the ticket to retrieve history/transactions for',
	},
	{
		displayName: 'Filter Transaction Types',
		name: 'transactionTypes',
		type: 'multiOptions',
		default: [],
		// eslint-disable-next-line n8n-nodes-base/node-param-multi-options-type-unsorted-items
		options: TRANSACTION_TYPE_OPTIONS,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getHistory'],
			},
		},
		description: 'Which transaction types to include. Leave empty for all types.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getHistory'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getHistory'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getHistory'],
			},
		},
		description: 'Whether to return only essential fields (Type, Created, Field, OldValue, NewValue, Description, Content, Attachments) and simplify Creator to just Name. When disabled, returns all available fields including TransactionId, MessageId, Headers, etc.',
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getHistory'],
			},
		},
		options: [
			{
				displayName: 'Created After',
				name: 'createdAfter',
				type: 'dateTime',
				default: '',
				description: 'Only return transactions created after this date/time',
			},
			{
				displayName: 'Created Before',
				name: 'createdBefore',
				type: 'dateTime',
				default: '',
				description: 'Only return transactions created before this date/time',
			},
			{
				displayName: 'Download Attachments',
				name: 'includeAttachments',
				type: 'boolean',
				default: false,
				description: 'Whether to download all attachment content. Text attachments will be added to the Attachments array with their content. Binary attachments (images, PDFs, etc.) will be added as n8n binary data.',
			},
			{
				displayName: 'Include Content',
				name: 'includeContent',
				type: 'boolean',
				default: false,
				description: 'Whether to extract content from the first text attachment and place it in a "Content" field. Only applies to Comment, Create, Correspond, EmailRecord, and CommentEmailRecord transactions.',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				default: 'DESC',
				options: [
					{
						name: 'Ascending',
						value: 'ASC',
					},
					{
						name: 'Descending',
						value: 'DESC',
					},
				],
				description: 'Sort order for the transactions',
			},
			{
				displayName: 'Order By',
				name: 'orderby',
				type: 'string',
				default: 'Created',
				description: 'Field to sort transactions by (default: Created)',
			},
			{
				displayName: 'Output Fields',
				name: 'outputFields',
				type: 'string',
				default: '',
				placeholder: 'e.g., Type,Creator,Created (empty = RT minimum)',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description: 'Comma-separated list of fields to return. Empty = RT returns minimum fields (id, type, _url). When specified, linked objects return IDs only.',
			},
		],
	},
];
