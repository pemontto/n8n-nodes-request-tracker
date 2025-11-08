import type { INodeProperties } from 'n8n-workflow';

const showOnlyForQueueGetMany = {
	resource: ['queue'],
	operation: ['getMany'],
};

export const queueGetManyDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: showOnlyForQueueGetMany },
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
				...showOnlyForQueueGetMany,
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: showOnlyForQueueGetMany },
		options: [
			{
				displayName: 'Queue Name Contains',
				name: 'queueName',
				type: 'string',
				default: '',
				description: 'Filter queues by name containing this value',
			},
			{
				displayName: 'Description Contains',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Filter queues by description containing this value',
			},
			{
				displayName: 'Lifecycle',
				name: 'lifecycle',
				type: 'string',
				default: '',
				description: 'Filter queues by lifecycle name (exact match)',
			},
		],
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showOnlyForQueueGetMany },
		options: [
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				default: 'ASC',
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
				description: 'Sort order for the queues',
			},
			{
				displayName: 'Order By',
				name: 'orderby',
				type: 'string',
				default: 'Name',
				description: 'Field to sort queues by (default: Name)',
			},
		],
	},
];
