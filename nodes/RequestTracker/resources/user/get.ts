import type { INodeProperties } from 'n8n-workflow';

const showOnlyForUserGet = {
	resource: ['user'],
	operation: ['get'],
};

export const userGetDescription: INodeProperties[] = [
	{
		displayName: 'User ID or Name',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '123 or username',
		description: 'The numeric ID or username of the user to retrieve',
		displayOptions: { show: showOnlyForUserGet },
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to simplify the response by flattening custom fields',
		displayOptions: { show: showOnlyForUserGet },
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
		displayOptions: { show: showOnlyForUserGet },
	},
];
