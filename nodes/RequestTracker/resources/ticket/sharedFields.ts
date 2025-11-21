import type { INodeProperties } from 'n8n-workflow';

/**
 * Shared field definitions for ticket operations (Create, Update, Comment, Correspond)
 * These functions generate INodeProperties arrays that can be used across different operations
 * Note: displayOptions should NOT be included in fields that are children of collection/fixedCollection
 */

export function getContentFields(displayOptions: { resource: string[]; operation: string[] }): INodeProperties[] {
	return [
		{
			displayName: 'Content',
			name: 'content',
			type: 'string',
			typeOptions: {
				rows: 4,
			},
			default: '',
			description: 'The content/message text',
			displayOptions: { show: displayOptions },
		},
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
			displayOptions: { show: displayOptions },
		},
	];
}

export function getBasicTicketFields(): INodeProperties[] {
	return [
		{
			displayName: 'Subject',
			name: 'subject',
			type: 'string',
			default: '',
			description: 'The subject/title of the ticket',
		},
		{
			displayName: 'Priority',
			name: 'priority',
			type: 'number',
			default: 0,
			description: 'The priority of the ticket (typically 0-99)',
		},
	];
}

export function getEmailFields(): INodeProperties[] {
	return [
		{
			displayName: 'Requestors',
			name: 'requestor',
			type: 'string',
			default: '',
			description: 'Email address(es) or username(s) of the person(s) requesting help. Provide multiple values as comma-separated (e.g., "user1@example.com,user2@example.com").',
		},
		{
			displayName: 'Cc',
			name: 'cc',
			type: 'string',
			default: '',
			description: 'Email address(es) to Cc. Provide multiple values as comma-separated.',
		},
		{
			displayName: 'Admin Cc',
			name: 'adminCc',
			type: 'string',
			default: '',
			description: 'Email address(es) to Admin Cc. Provide multiple values as comma-separated.',
		},
	];
}

export function getDateFields(): INodeProperties[] {
	return [
		{
			displayName: 'Due',
			name: 'due',
			type: 'dateTime',
			default: '',
			description: 'Due date for the ticket (ISO 8601 format)',
		},
		{
			displayName: 'Starts',
			name: 'starts',
			type: 'dateTime',
			default: '',
			description: 'Start date for the ticket (ISO 8601 format)',
		},
	];
}

export function getTimeFields(): INodeProperties[] {
	return [
		{
			displayName: 'Time Estimated',
			name: 'timeEstimated',
			type: 'string',
			default: '',
			description: 'Estimated time to resolve (e.g., "2 hours", "30 minutes")',
		},
		{
			displayName: 'Time Worked',
			name: 'timeWorked',
			type: 'string',
			default: '',
			description: 'Time worked on this update (e.g., "1 hour", "15 minutes")',
		},
		{
			displayName: 'Time Left',
			name: 'timeLeft',
			type: 'string',
			default: '',
			description: 'Time remaining to complete (e.g., "3 hours", "45 minutes")',
		},
	];
}

export function getSLAField(): INodeProperties {
	return {
		displayName: 'SLA',
		name: 'sla',
		type: 'string',
		default: '',
		description: 'The SLA (Service Level Agreement) for the ticket',
	};
}

export function getQueueField(displayOptions: { resource: string[]; operation: string[] }): INodeProperties {
	return {
		displayName: 'Queue',
		name: 'queue',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The queue name or ID',
		displayOptions: { show: displayOptions },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchQueues',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name or ID',
				name: 'name',
				type: 'string',
				placeholder: 'e.g., General or 1',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '.+',
							errorMessage: 'Queue name or ID is required',
						},
					},
				],
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g., 1',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '\\d+',
							errorMessage: 'Queue ID must be a number',
						},
					},
				],
			},
		],
	};
}

export function getOwnerField(): INodeProperties {
	return {
		displayName: 'Owner',
		name: 'owner',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The username or email of the ticket owner',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchUsers',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Username',
				name: 'name',
				type: 'string',
				placeholder: 'e.g., jsmith or jsmith@example.com',
			},
		],
	};
}

export function getStatusField(): INodeProperties {
	return {
		displayName: 'Status Name or ID',
		name: 'status',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getStatuses',
		},
		default: '',
		description: 'The status of the ticket. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	};
}

export function getCustomFieldsResourceMapper(): INodeProperties {
	return {
		displayName: 'Custom Fields',
		name: 'customFieldsUi',
		type: 'resourceMapper',
		noDataExpression: true,
		default: {
			mappingMode: 'mapEachColumnManually',
			value: null,
		},
		description:
			'Map custom field values using the resource mapper. Fetches available custom fields from RT based on the resolved queue (from Queue or Ticket ID). Fields are added on demand.',
		typeOptions: {
			// Refresh when queue or ticket context changes
			loadOptionsDependsOn: ['queue.value', 'queue', 'updateFields.queue', 'updateFields.queue.value', 'ticketId'],
			resourceMapper: {
				resourceMapperMethod: 'getMappingColumns',
				mode: 'add',
				fieldWords: {
					singular: 'custom field',
					plural: 'custom fields',
				},
				// Prevent auto-populating empty fields on initial load
				addAllFields: false,
				multiKeyMatch: false,
				supportAutoMap: false,
			},
		},
	};
}

export function getCustomFieldsCollection(): INodeProperties {
	return {
		displayName: 'Custom Fields (Collection)',
		name: 'customFieldsCollection',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		description: 'Custom field values as name/value pairs (UI format). Takes precedence over Custom Fields (JSON) for duplicate fields.',
		options: [
			{
				name: 'fields',
				displayName: 'Field',
				values: [
					{
						displayName: 'Field Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'The name of the custom field (e.g., "Action Performed", "Service")',
					},
					{
						displayName: 'Field Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'The value for the custom field',
					},
				],
			},
		],
	};
}

export function getCustomFieldsJson(): INodeProperties {
	return {
		displayName: 'Custom Fields (JSON)',
		name: 'customFields',
		type: 'json',
		default: '{}',
		description: 'Custom fields as a JSON object. Example: {"Action Performed": "Filter Added", "Service": "SIEM", "Severity": "Low"}.',
		placeholder: '{\n  "Action Performed": "Filter Added",\n  "Service": "SIEM"\n}',
	};
}

export function getTimeTakenField(): INodeProperties {
	return {
		displayName: 'Time Taken',
		name: 'timeTaken',
		type: 'string',
		default: '',
		description: 'Time taken for this action in minutes (e.g., "30" for 30 minutes)',
	};
}

/**
 * Helper to build CustomFields object by merging JSON and collection formats
 * 1. Start with customFields (JSON) if provided (as base)
 * 2. Overlay customFieldsCollection on top (collection takes precedence)
 * Returns undefined if neither is provided
 *
 * Just uses spread operator - much simpler!
 *
 * @param basePath - The base parameter path (e.g., '$parameter.additionalFields' or '$parameter.updateFields')
 */
export function buildCustomFieldsExpression(basePath: string = '$parameter'): string {
	const json = `${basePath}?.customFields`;
	const collection = `${basePath}?.customFieldsCollection?.fields?.reduce((acc, f) => { acc[f.name] = f.value; return acc; }, {})`;

	return `Object.keys({ ...(${json} || {}), ...(${collection} || {}) }).length > 0 ? { ...(${json} || {}), ...(${collection} || {}) } : undefined`;
}

export function getAttachmentsField(displayOptions: { resource: string[]; operation: string[] }): INodeProperties[] {
	return [
		{
			displayName: 'Attachment Source',
			name: 'attachmentSource',
			type: 'options',
			options: [
				{
					name: 'None',
					value: 'none',
					description: 'Do not attach any files',
				},
				{
					name: 'All Binary Data',
					value: 'allBinaryData',
					description: 'Attach all binary data from input item',
				},
				{
					name: 'Select Binary Properties',
					value: 'binaryProperties',
					description: 'Select specific binary properties to attach',
				},
				{
					name: 'Manual (JSON)',
					value: 'manual',
					description: 'Manually specify attachments as JSON array',
				},
			],
			default: 'none',
			description: 'How to provide attachment files',
			displayOptions: { show: displayOptions },
		},
		{
			displayName: 'Binary Properties',
			name: 'binaryProperties',
			type: 'string',
			default: '',
			description: 'Comma-separated list of binary property names to attach (e.g., "data,file1,file2")',
			placeholder: 'data',
			displayOptions: {
				show: {
					...displayOptions,
					attachmentSource: ['binaryProperties'],
				},
			},
		},
		{
			displayName: 'Attachments JSON',
			name: 'attachmentsJson',
			type: 'json',
			default: '[]',
			description: 'JSON array of attachments with FileName, FileType, and FileContent (base64) fields',
			placeholder: '[{"FileName": "doc.pdf", "FileType": "application/pdf", "FileContent": "JVBERi0x..."}]',
			displayOptions: {
				show: {
					...displayOptions,
					attachmentSource: ['manual'],
				},
			},
		},
	];
}
