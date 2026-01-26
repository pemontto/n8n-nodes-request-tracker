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
		placeholder: 'Leave empty for all standard fields',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description: 'Comma-separated list of fields to return (e.g., "id,Subject,Status,CustomFields"). When specified, linked objects (Creator, Queue, etc.) return IDs only. Leave empty for full data with expanded linked objects.',
		displayOptions: { show: showOnlyForTicketGet },
	},
];