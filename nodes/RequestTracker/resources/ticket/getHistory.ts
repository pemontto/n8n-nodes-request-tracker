import type { INodeProperties } from 'n8n-workflow';

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
		options: [
			// Common standard types (from RT's @TxnTypeTicketList)
			{ name: 'Create', value: 'Create' },
			{ name: 'Correspond', value: 'Correspond' },
			{ name: 'Comment', value: 'Comment' },
			{ name: 'Comment Email Record', value: 'CommentEmailRecord' },
			{ name: 'Email Record', value: 'EmailRecord' },
			{ name: 'Status', value: 'Status' },
			{ name: 'Set', value: 'Set' },
			{ name: 'Custom Field', value: 'CustomField' },
			{ name: 'Add Link', value: 'AddLink' },
			{ name: 'Delete Link', value: 'DeleteLink' },
			{ name: 'Add Watcher', value: 'AddWatcher' },
			{ name: 'Delete Watcher', value: 'DelWatcher' },
			{ name: 'Set Watcher', value: 'SetWatcher' },
			{ name: 'Forward Ticket', value: 'Forward Ticket' },
			{ name: 'Forward Transaction', value: 'Forward Transaction' },
			// Additional less common types
			{ name: 'Take', value: 'Take' },
			{ name: 'Untake', value: 'Untake' },
			{ name: 'Steal', value: 'Steal' },
			{ name: 'Give', value: 'Give' },
			{ name: 'Subject', value: 'Subject' },
			{ name: 'Told', value: 'Told' },
			{ name: 'Set Time Worked', value: 'Set-TimeWorked' },
			{ name: 'Add Reminder', value: 'AddReminder' },
			{ name: 'Open Reminder', value: 'OpenReminder' },
			{ name: 'Resolve Reminder', value: 'ResolveReminder' },
		],
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
		],
	},
];
