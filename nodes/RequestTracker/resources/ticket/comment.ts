import type { INodeProperties } from 'n8n-workflow';
import {
	getContentFields,
	getBasicTicketFields,
	getTimeTakenField,
	getCustomFieldsCollection,
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
		...getContentFields(showOnlyFor).map((field, index) => ({
			...field,
			required: index === 0, // Content field is required
		})),
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: { show: showOnlyFor },
			options: [
				// Only include Subject and Status from basic fields
				...getBasicTicketFields().filter(f =>
					f.name === 'subject' || f.name === 'status'
				),
				getTimeTakenField(),
				getCustomFieldsJson(),
				getCustomFieldsCollection(),
			],
		},
		...getAttachmentsField(showOnlyFor),
	] as INodeProperties[];
}

export const ticketCommentDescription = getCommentCorrespondDescription('addComment');
export const ticketCorrespondDescription = getCommentCorrespondDescription('addCorrespondence');
