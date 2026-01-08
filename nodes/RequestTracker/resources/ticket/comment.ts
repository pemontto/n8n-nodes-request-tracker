import type { INodeProperties } from 'n8n-workflow';
import {
	getBasicTicketFields,
	getStatusField,
	getTimeTakenField,
	getCustomFieldsNotice,
	getCustomFieldsResourceMapper,
	getCustomFieldsJson,
	getAttachmentsField,
} from './sharedFields';

// Shared description for both Comment and Correspondence operations
function getCommentCorrespondDescription(operation: 'addComment' | 'addCorrespondence') {
	const showOnlyFor = {
		resource: ['ticket'],
		operation: [operation],
	};

	const isComment = operation === 'addComment';
	const operationLabel = isComment ? 'comment' : 'correspondence';

	return [
		{
			displayName: 'Ticket ID',
			name: 'ticketId',
			type: 'string',
			default: '',
			required: true,
			description: `The numeric ID of the ticket to add ${operationLabel} to`,
			displayOptions: { show: showOnlyFor },
		},
		{
			displayName: 'Content',
			name: 'content',
			type: 'string',
			typeOptions: {
				rows: 4,
			},
			default: '',
			required: true,
			description: 'The content/message text',
			displayOptions: { show: showOnlyFor },
		},
		// Custom Fields section - at top level for visibility
		getCustomFieldsNotice(showOnlyFor),
		{
			...getCustomFieldsResourceMapper(),
			displayOptions: { show: showOnlyFor },
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: { show: showOnlyFor },
			options: [
				// Only include Subject from basic fields, use statusField for Status
				...getBasicTicketFields().filter(f => f.name === 'subject'),
				getStatusField(),
				getTimeTakenField(),
				getCustomFieldsJson(),
			],
		},
		...getAttachmentsField(showOnlyFor),
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			displayOptions: { show: showOnlyFor },
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
					description: 'MIME type for the content',
				},
			],
		},
	] as INodeProperties[];
}

export const ticketCommentDescription = getCommentCorrespondDescription('addComment');
export const ticketCorrespondDescription = getCommentCorrespondDescription('addCorrespondence');
