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
];