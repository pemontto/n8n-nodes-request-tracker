import type { INodeProperties } from 'n8n-workflow';

const showOnlyForQueueGet = {
	resource: ['queue'],
	operation: ['get'],
};

export const queueGetDescription: INodeProperties[] = [
	{
		displayName: 'Queue ID or Name',
		name: 'queueId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '1 or General',
		description: 'The numeric ID or name of the queue to retrieve',
		displayOptions: { show: showOnlyForQueueGet },
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to simplify the response by flattening custom fields and converting user objects to readable strings',
		displayOptions: { show: showOnlyForQueueGet },
	},
	{
		displayName: 'Output Fields',
		name: 'outputFields',
		type: 'string',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
		placeholder: 'e.g., id,Name,Description (empty = RT minimum)',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description: 'Comma-separated list of fields to return. Empty = RT returns minimum fields (id, type, _url). When specified, linked objects return IDs only.',
		displayOptions: { show: showOnlyForQueueGet },
	},
];
