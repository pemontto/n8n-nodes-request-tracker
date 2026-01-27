import type { INodeProperties } from 'n8n-workflow';

const showOnlyForUserGetMany = {
	resource: ['user'],
	operation: ['getMany'],
};

export const userGetManyDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: showOnlyForUserGetMany },
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
				...showOnlyForUserGetMany,
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
		displayOptions: { show: showOnlyForUserGetMany },
		options: [
			{
				displayName: 'Username Contains',
				name: 'username',
				type: 'string',
				default: '',
				description: 'Filter users by username (Name field) containing this value',
			},
			{
				displayName: 'Email Contains',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Filter users by email address containing this value',
			},
		],
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showOnlyForUserGetMany },
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
				description: 'Sort order for the users',
			},
			{
				displayName: 'Order By',
				name: 'orderby',
				type: 'string',
				default: 'Name',
				description: 'Field to sort users by (default: Name)',
			},
			{
				displayName: 'Include All Users',
				name: 'includeAllUsers',
				type: 'boolean',
				default: false,
				description: 'Whether to include all users instead of privileged users only',
			},
			{
				displayName: 'Output Fields',
				name: 'outputFields',
				type: 'string',
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
				placeholder: 'e.g., id,Name,EmailAddress (empty = RT minimum)',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description: 'Comma-separated list of fields to return. Empty = RT returns minimum fields (id, type, _url). When specified, linked objects return IDs only.',
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to simplify the response by flattening custom fields',
		displayOptions: { show: showOnlyForUserGetMany },
	},
];
