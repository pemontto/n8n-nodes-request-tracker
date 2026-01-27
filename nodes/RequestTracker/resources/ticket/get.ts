import type { INodeProperties } from 'n8n-workflow';

const showOnlyForTicketGet = {
	resource: ['ticket'],
	operation: ['get'],
};

export const ticketGetDescription: INodeProperties[] = [
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		default: '',
		required: true,
		description: 'The numeric ID of the ticket to retrieve',
		displayOptions: { show: showOnlyForTicketGet },
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to simplify the response by flattening custom fields and converting user/queue objects to readable strings',
		displayOptions: { show: showOnlyForTicketGet },
	},
	{
		displayName: 'Output Fields',
		name: 'outputFields',
		type: 'string',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
		placeholder: 'e.g., id,Subject,Status (empty = RT minimum)',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description: 'Comma-separated list of fields to return. Empty = RT returns minimum fields (id, type, _url). When specified, linked objects (Creator, Queue, etc.) return IDs only.',
		displayOptions: { show: showOnlyForTicketGet },
	},
];