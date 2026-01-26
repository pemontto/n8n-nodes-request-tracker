import type { INodeProperties } from 'n8n-workflow';

const showOnlyForAttachmentGetMany = {
	resource: ['attachment'],
	operation: ['getMany'],
};

export const attachmentGetManyDescription: INodeProperties[] = [
	{
		displayName: 'Scope',
		name: 'scope',
		type: 'options',
		default: 'ticket',
		required: true,
		displayOptions: { show: showOnlyForAttachmentGetMany },
		options: [
			{
				name: 'Transaction',
				value: 'transaction',
				description: 'Get attachments for a specific transaction',
			},
			{
				name: 'Ticket',
				value: 'ticket',
				description: 'Get attachments for a specific ticket',
			},
		],
		description: 'Whether to get attachments for a transaction or ticket',
	},
	{
		displayName: 'Transaction ID',
		name: 'transactionId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '12345',
		description: 'The numeric ID of the transaction',
		displayOptions: {
			show: {
				...showOnlyForAttachmentGetMany,
				scope: ['transaction'],
			},
		},
	},
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '12345',
		description: 'The numeric ID of the ticket',
		displayOptions: {
			show: {
				...showOnlyForAttachmentGetMany,
				scope: ['ticket'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: showOnlyForAttachmentGetMany },
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
				...showOnlyForAttachmentGetMany,
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
			show: showOnlyForAttachmentGetMany,
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description: 'Whether to return only essential fields (id, Filename, ContentType, ContentLength, Creator) and simplify Creator to just Name. When disabled, returns all available fields including Headers, Subject, etc.',
	},
	{
		displayName: 'Filter Options',
		name: 'filterOptions',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: showOnlyForAttachmentGetMany },
		options: [
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'string',
				default: '',
				placeholder: 'image/png',
				description: 'Filter by content type/MIME type',
			},
			{
				displayName: 'Created After',
				name: 'createdAfter',
				type: 'dateTime',
				default: '',
				description: 'Only return attachments created after this date/time',
			},
			{
				displayName: 'Created Before',
				name: 'createdBefore',
				type: 'dateTime',
				default: '',
				description: 'Only return attachments created before this date/time',
			},
			{
				displayName: 'Filename',
				name: 'filename',
				type: 'string',
				default: '',
				placeholder: 'document.pdf',
				description: 'Filter by filename (partial match)',
			},
			{
				displayName: 'Filename Exists',
				name: 'filenameExists',
				type: 'boolean',
				default: false,
				description: 'Whether to only return attachments that have a non-empty filename',
			},
		],
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showOnlyForAttachmentGetMany },
		options: [
			{
				displayName: 'Download Content',
				name: 'downloadContent',
				type: 'boolean',
				default: false,
				description: 'Whether to download attachment content and add as binary data',
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
				description: 'Sort order for the attachments',
			},
			{
				displayName: 'Order By',
				name: 'orderby',
				type: 'string',
				default: 'Created',
				description: 'Field to sort attachments by (default: Created)',
			},
			{
				displayName: 'Output Fields',
				name: 'outputFields',
				type: 'string',
				default: '',
				placeholder: 'Leave empty for all standard fields',
				description: 'Comma-separated list of fields to return (e.g., "Filename,ContentType,Content"). Leave empty for standard attachment fields with automatic expansion of linked objects.',
			},
		],
	},
];
