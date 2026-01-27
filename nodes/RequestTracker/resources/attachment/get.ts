import type { INodeProperties } from 'n8n-workflow';

const showOnlyForAttachmentGet = {
	resource: ['attachment'],
	operation: ['get'],
};

export const attachmentGetDescription: INodeProperties[] = [
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '12345',
		description: 'The numeric ID of the attachment to retrieve',
		displayOptions: { show: showOnlyForAttachmentGet },
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: showOnlyForAttachmentGet,
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description: 'Whether to return only essential fields (id, Filename, ContentType, ContentLength, Creator) and simplify Creator to just Name. When disabled, returns all available fields including Headers, Subject, etc.',
	},
	{
		displayName: 'Output Fields',
		name: 'outputFields',
		type: 'string',
		default: '',
		placeholder: 'e.g., Filename,ContentType,Content (empty = RT minimum)',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description: 'Comma-separated list of fields to return. Empty = RT returns minimum fields (id, type, _url). When specified, linked objects return IDs only.',
		displayOptions: { show: showOnlyForAttachmentGet },
	},
];
