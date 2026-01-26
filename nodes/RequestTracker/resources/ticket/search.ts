import type { INodeProperties } from 'n8n-workflow';

const showOnlyForTicketSearch = {
	resource: ['ticket'],
	operation: ['search'],
};

export const ticketSearchDescription: INodeProperties[] = [
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		default: 'ticketSQL',
		required: true,
		displayOptions: { show: showOnlyForTicketSearch },
		options: [
			{
				name: 'TicketSQL Query',
				value: 'ticketSQL',
				description: 'Use TicketSQL syntax for advanced searching',
			},
			{
				name: 'Simple Search',
				value: 'simple',
				description: 'Use simple keyword-based search',
			},
			{
				name: 'Saved Search',
				value: 'saved',
				description: 'Use a saved search by ID or description',
			},
		],
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		required: true,
		description: 'TicketSQL query (e.g., "Status = \'new\' OR Status = \'open\'")',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				...showOnlyForTicketSearch,
				searchType: ['ticketSQL'],
			},
		},
	},
	{
		displayName: 'Query',
		name: 'simpleQuery',
		type: 'string',
		default: '',
		required: true,
		description: 'Simple search query with keywords',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				...showOnlyForTicketSearch,
				searchType: ['simple'],
			},
		},
	},
	{
		displayName: 'Saved Search',
		name: 'savedSearch',
		type: 'string',
		default: '',
		required: true,
		description: 'Saved search ID or description',
		displayOptions: {
			show: {
				...showOnlyForTicketSearch,
				searchType: ['saved'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: showOnlyForTicketSearch },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				...showOnlyForTicketSearch,
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to simplify the response by flattening custom fields and converting user/queue objects to readable strings',
		displayOptions: { show: showOnlyForTicketSearch },
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showOnlyForTicketSearch },
		options: [
			{
				displayName: 'Include Disabled',
				name: 'find_disabled_rows',
				type: 'boolean',
				default: false,
				description: 'Whether to include disabled tickets in results',
			},
			{
				displayName: 'Order By',
				name: 'orderby',
				type: 'string',
				default: 'id',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description: 'Field name to sort by (e.g., "id", "Created", "LastUpdated")',
			},
			{
				displayName: 'Order Direction',
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
				description: 'Sort order direction',
			},
			{
				displayName: 'Output Fields',
				name: 'outputFields',
				type: 'string',
				default: '',
				placeholder: 'Leave empty for all standard fields',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description: 'Comma-separated list of fields to return (e.g., "id,Subject,Status,Queue"). Leave empty for standard fields with automatic expansion of linked objects.',
			},
		],
	},
];