import type { INodeProperties } from 'n8n-workflow';
import {
	getBasicTicketFields,
	getEmailFields,
	getDateFields,
	getTimeFields,
	getSLAField,
	getQueueField,
	getStatusField,
	getOwnerField,
	getCustomFieldsResourceMapper,
	getCustomFieldsCollection,
	getCustomFieldsJson,
	getAttachmentsField,
} from './sharedFields';

const showOnlyForTicketCreate = {
	resource: ['ticket'],
	operation: ['create'],
};

export const ticketCreateDescription: INodeProperties[] = [
	{
		...getQueueField(showOnlyForTicketCreate),
		required: true,
		description: 'The queue name or ID where the ticket will be created',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
		description: 'The subject/title of the ticket',
		displayOptions: { show: showOnlyForTicketCreate },
	},
	{
		displayName: 'Requestors',
		name: 'requestor',
		type: 'string',
		default: '',
		description: 'Email address(es) or username(s) of the person(s) requesting help. Provide multiple values as comma-separated (e.g., "user1@example.com,user2@example.com").',
		displayOptions: { show: showOnlyForTicketCreate },
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		description: 'The initial content/description of the ticket',
		displayOptions: { show: showOnlyForTicketCreate },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForTicketCreate },
		options: [
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				options: [
					{
						name: 'Text/HTML',
						value: 'text/html',
					},
					{
						name: 'Text/Plain',
						value: 'text/plain',
					},
				],
				default: 'text/html',
				description: 'MIME type for the ticket content',
			},
			...getBasicTicketFields().filter(f => f.name !== 'subject'), // Subject is already a top-level required field
			getStatusField(),
			getOwnerField(),
			...getEmailFields().filter(f => f.name !== 'requestor'), // Requestor is already a top-level field
			...getDateFields(),
			...getTimeFields().filter(f => f.name === 'timeEstimated'), // Only timeEstimated for create
			getSLAField(),
			getCustomFieldsResourceMapper(),
			getCustomFieldsJson(),
			getCustomFieldsCollection(),
		],
	},
	...getAttachmentsField(showOnlyForTicketCreate),
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to simplify the response by flattening custom fields and converting user/queue objects to readable strings',
		displayOptions: { show: showOnlyForTicketCreate },
	},
];
