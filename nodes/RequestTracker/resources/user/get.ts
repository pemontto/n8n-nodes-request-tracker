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
];
