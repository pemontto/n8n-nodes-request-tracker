import type { INodeProperties } from 'n8n-workflow';
import {
	getBasicTicketFields,
	getEmailFields,
	getDateFields,
	getTimeFields,
	getSLAField,
	getCustomFieldsCollection,
	getCustomFieldsJson,
} from './sharedFields';

const showOnlyForTicketUpdate = {
	resource: ['ticket'],
	operation: ['update'],
};

export const ticketUpdateDescription: INodeProperties[] = [
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		default: '',
		required: true,
		description: 'The numeric ID of the ticket to update',
		displayOptions: { show: showOnlyForTicketUpdate },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForTicketUpdate },
		options: [
			...getBasicTicketFields(),
			{
				displayName: 'Queue',
				name: 'queue',
				type: 'string',
				default: '',
				description: 'The queue name or ID',
			},
			...getEmailFields(),
			...getDateFields(),
			...getTimeFields(),
			getSLAField(),
			getCustomFieldsJson(),
			getCustomFieldsCollection(),
		],
	},
];
