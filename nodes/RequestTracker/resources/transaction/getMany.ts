import type { INodeProperties } from 'n8n-workflow';

const showOnlyForTransactionGetMany = {
	resource: ['transaction'],
	operation: ['getMany'],
};

export const transactionGetManyDescription: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: true,
		placeholder: "Creator='user@example.com' AND Type='Correspond'",
		description: 'TransactionSQL query to search for transactions. Example: Creator=\'Dave\' AND Type=\'Correspond\'.',
		displayOptions: { show: showOnlyForTransactionGetMany },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: showOnlyForTransactionGetMany },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				...showOnlyForTransactionGetMany,
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: showOnlyForTransactionGetMany,
		},
		description: 'Whether to return only essential fields (Type, Created, Field, OldValue, NewValue, Description, Content, Attachments) and simplify Creator to just Name. When disabled, returns all available fields including TransactionId, MessageId, Headers, etc.',
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showOnlyForTransactionGetMany },
		// eslint-disable-next-line n8n-nodes-base/node-param-collection-type-unsorted-items
		options: [
			{
				displayName: 'Include Content',
				name: 'includeContent',
				type: 'boolean',
				default: false,
				description: 'Whether to extract content from the first text attachment and place it in a "content" field. Only applies to Comment, Create, Correspond, EmailRecord, and CommentEmailRecord transactions.',
			},
			{
				displayName: 'Download Attachments',
				name: 'includeAttachments',
				type: 'boolean',
				default: false,
				description: 'Whether to download all attachment content. Text attachments will be added to the Attachments array with their content. Binary attachments (images, PDFs, etc.) will be added as n8n binary data.',
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
