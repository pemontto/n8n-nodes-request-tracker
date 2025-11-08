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
];
