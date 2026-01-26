import type { INodeProperties } from 'n8n-workflow';

const showOnlyForTransactionGet = {
	resource: ['transaction'],
	operation: ['get'],
};

export const transactionGetDescription: INodeProperties[] = [
	{
		displayName: 'Transaction ID',
		name: 'transactionId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '12345',
		description: 'The numeric ID of the transaction to retrieve',
		displayOptions: { show: showOnlyForTransactionGet },
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: showOnlyForTransactionGet,
		},
		description: 'Whether to return only essential fields (Type, Created, Field, OldValue, NewValue, Description, Content, Attachments) and simplify Creator to just Name. When disabled, returns all available fields including TransactionId, MessageId, Headers, etc.',
	},
	{
		displayName: 'Output Fields',
		name: 'outputFields',
		type: 'string',
		default: '',
		placeholder: 'Leave empty for all standard fields',
		description: 'Comma-separated list of fields to return (e.g., "Type,Creator,Created,Description"). Leave empty for standard transaction fields with automatic expansion of linked objects.',
		displayOptions: { show: showOnlyForTransactionGet },
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showOnlyForTransactionGet },
		options: [
			{
				displayName: 'Include Content',
				name: 'includeContent',
				type: 'boolean',
				default: false,
				description: 'Whether to extract content from the first text attachment (preferring text/html over text/plain) and place it in a "content" field. Only applies to Comment, Create, Correspond, EmailRecord, and CommentEmailRecord transactions.',
			},
			{
				displayName: 'Download Attachments',
				name: 'includeAttachments',
				type: 'boolean',
				default: false,
				description: 'Whether to download all attachment content. Text attachments will be added to the Attachments array with their content. Binary attachments (images, PDFs, etc.) will be added as n8n binary data.',
			},
		],
	},
];
