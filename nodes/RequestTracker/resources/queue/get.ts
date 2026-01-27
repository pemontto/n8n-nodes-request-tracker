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
];
