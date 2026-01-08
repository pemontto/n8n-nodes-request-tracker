import type {
	IDataObject,
	INodeExecutionData,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	IHttpRequestOptions,
	JsonObject,
	IBinaryData,
	Logger,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

/**
 * Centralized constants for user-related fields and ticket key ordering
 */
const USER_FIELDS = ['Creator', 'LastUpdatedBy', 'Owner'] as const;
const USER_ARRAY_FIELDS = ['Requestors', 'Cc', 'AdminCc'] as const;
const TRANSACTION_CONTENT_TYPES = ['Comment', 'Create', 'Correspond', 'EmailRecord', 'CommentEmailRecord'] as const;
const TICKET_PREFERRED_ORDER = [
	'id',
	'Queue',
	'Subject',
	'Status',
	'Type',
	'Priority',
	'Created',
	'Creator',
	'LastUpdated',
	'LastUpdatedBy',
	'Owner',
	'Requestors',
	'Cc',
	'AdminCc',
	'CustomFields',
	'Links',
] as const;

/**
 * Preferred sort order for Queue objects
 */
const QUEUE_PREFERRED_ORDER = [
	'id',
	'Name',
	'Description',
	'Lifecycle',
	'Created',
	'LastUpdated',
	'Creator',
	'LastUpdatedBy',
	'CorrespondAddress',
	'CommentAddress',
	'SubjectTag',
	'SortOrder',
	'SLADisabled',
	'Disabled',
	'CustomFields',
	'_url',
	'type',
] as const;

/**
 * Preferred sort order for User objects
 */
const USER_PREFERRED_ORDER = [
	'id',
	'Name',
	'RealName',
	'EmailAddress',
	'Organization',
	'Created',
	'LastUpdated',
	'Creator',
	'LastUpdatedBy',
	'Address1',
	'Address2',
	'City',
	'State',
	'Zip',
	'Country',
	'MobilePhone',
	'HomePhone',
	'WorkPhone',
	'PagerPhone',
	'Timezone',
	'Lang',
	'Signature',
	'Comments',
	'CustomFields',
	'_url',
	'type',
	'Gecos',
	'NickName',
] as const;

/**
 * Normalize RT CustomFields array to a sorted dictionary
 */
function normalizeCustomFields(input: unknown): IDataObject | undefined {
	if (Array.isArray(input)) {
		const dict: IDataObject = {};
		for (const field of input as IDataObject[]) {
			const fieldName = (field.name as string) || '';
			const values = field.values as unknown[];
			if (!fieldName) continue;

			if (!values || values.length === 0) {
				dict[fieldName] = null;
			} else if (values.length === 1) {
				dict[fieldName] = values[0] as string | number | boolean;
			} else {
				dict[fieldName] = values as unknown[];
			}
		}
		return simpleAlphanumericSort(dict);
	}
	if (input && typeof input === 'object' && !Array.isArray(input)) {
		return simpleAlphanumericSort(input as IDataObject);
	}
	return undefined;
}

/**
 * Generic simplifier for resources
 */
function simplifyResource(
	resource: IDataObject,
	opts: {
		userFields?: readonly string[];
		userArrayFields?: readonly string[];
		flattenCustomFields?: boolean;
	} = {},
): IDataObject {
	const out: IDataObject = { ...resource };

	// Flatten CustomFields into top-level properties
	if (opts.flattenCustomFields !== false) {
		if (
			out.CustomFields &&
			typeof out.CustomFields === 'object' &&
			!Array.isArray(out.CustomFields)
		) {
			for (const [cfKey, cfValue] of Object.entries(out.CustomFields as IDataObject)) {
				if (Object.prototype.hasOwnProperty.call(out, cfKey)) {
					out[`CF_${cfKey}`] = cfValue;
				} else {
					out[cfKey] = cfValue;
				}
			}
			delete out.CustomFields;
		}
	}

	// Simplify user-like fields
	if (opts.userFields) {
		for (const field of opts.userFields) {
			if (out[field]) {
				out[field] = simplifyUserObject(out[field] as IDataObject);
			}
		}
	}

	if (opts.userArrayFields) {
		for (const field of opts.userArrayFields) {
			if (Array.isArray(out[field])) {
				out[field] = (out[field] as IDataObject[]).map(simplifyUserObject);
			}
		}
	}

	return out;
}

/**
 * Simple alphanumeric sort for object keys
 */
function simpleAlphanumericSort(obj: IDataObject): IDataObject {
	const sortedObj: IDataObject = {};
	Object.keys(obj)
		.sort((a, b) => a.localeCompare(b))
		.forEach((key) => {
			sortedObj[key] = obj[key];
		});
	return sortedObj;
}

/**
 * Transform RT operation response (numeric-keyed object with messages) into user-friendly format
 * This handles responses from Update, Add Comment, and Add Correspondence operations
 */
export async function transformOperationResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	return items.map((item, itemIndex) => {
		const responseBody = item.json as IDataObject;

		// Check if this is an operation response (numeric string keys with messages)
		const keys = Object.keys(responseBody);
		const isOperationResponse = keys.every(key => /^\d+$/.test(key));

		if (isOperationResponse && keys.length > 0) {
			// Convert to array of messages
			const messages = keys
				.sort((a, b) => parseInt(a) - parseInt(b))
				.map(key => responseBody[key] as string);

			// Get ticketId from node parameters for this specific item
			const ticketId = this.getNodeParameter('ticketId', itemIndex) as string;

			return {
				json: {
					success: true,
					...(ticketId ? { ticketId } : {}),
					messages,
				},
				pairedItem: item.pairedItem,
			};
		}

		// If not an operation response, return as-is
		return item;
	});
}

/**
 * Sorts ticket keys with a preferred order for some, then alphanumeric for the rest
 */
function sortTicketKeysWithPreferredOrder(obj: IDataObject): IDataObject {
	const result: IDataObject = {};
	const allKeys = Object.keys(obj);
	const remainingKeys: string[] = [];

	for (const key of TICKET_PREFERRED_ORDER as readonly string[]) {
		if (allKeys.includes(key)) {
			result[key] = obj[key];
		}
	}

	for (const key of allKeys) {
		if (!(TICKET_PREFERRED_ORDER as readonly string[]).includes(key)) {
			remainingKeys.push(key);
		}
	}
	remainingKeys.sort((a, b) => a.localeCompare(b));

	for (const key of remainingKeys) {
		result[key] = obj[key];
	}
	return result;
}

/**
 * Sorts queue keys using preferred order, then alphanumeric for the rest
 */
function sortQueueKeysWithPreferredOrder(obj: IDataObject): IDataObject {
	const result: IDataObject = {};
	const allKeys = Object.keys(obj);
	const remainingKeys: string[] = [];

	for (const key of QUEUE_PREFERRED_ORDER as readonly string[]) {
		if (allKeys.includes(key)) {
			result[key] = obj[key];
		}
	}

	for (const key of allKeys) {
		if (!(QUEUE_PREFERRED_ORDER as readonly string[]).includes(key)) {
			remainingKeys.push(key);
		}
	}
	remainingKeys.sort((a, b) => a.localeCompare(b));

	for (const key of remainingKeys) {
		result[key] = obj[key];
	}
	return result;
}

/**
 * Sorts user keys using preferred order, then alphanumeric for the rest
 */
function sortUserKeysWithPreferredOrder(obj: IDataObject): IDataObject {
	const result: IDataObject = {};
	const allKeys = Object.keys(obj);
	const remainingKeys: string[] = [];

	for (const key of USER_PREFERRED_ORDER as readonly string[]) {
		if (allKeys.includes(key)) {
			result[key] = obj[key];
		}
	}

	for (const key of allKeys) {
		if (!(USER_PREFERRED_ORDER as readonly string[]).includes(key)) {
			remainingKeys.push(key);
		}
	}
	remainingKeys.sort((a, b) => a.localeCompare(b));

	for (const key of remainingKeys) {
		result[key] = obj[key];
	}
	return result;
}

/**
 * Simplify a user object to a readable string using cascading fallback
 * Priority order: EmailAddress -> Name -> id
 */
function simplifyUserObject(userObj: IDataObject | string): string | IDataObject {
	if (userObj && typeof userObj === 'object') {
		// Cascade: EmailAddress -> Name -> id
		if (userObj.EmailAddress && typeof userObj.EmailAddress === 'string') {
			return userObj.EmailAddress;
		}
		if (userObj.Name && typeof userObj.Name === 'string') {
			return userObj.Name;
		}
		if (userObj.id) {
			return userObj.id as string;
		}
	}
	return userObj;
}

/**
 * Core transformation logic for ticket data
 * Exported for use in trigger node
 */
export function transformSingleTicket(ticket: IDataObject, simplify: boolean): IDataObject {
	const transformed = { ...ticket };

	// Transform CustomFields from array to dictionary
	const normalizedCF = normalizeCustomFields(transformed.CustomFields);
	if (normalizedCF) {
		transformed.CustomFields = normalizedCF;
	}

	// Transform _hyperlinks to Links
	if (Array.isArray(transformed._hyperlinks)) {
		const links: IDataObject = {
			self: null,
			tickets: [],
			external: [],
			actions: {
				history: null,
				correspond: null,
				comment: null,
			},
			lifecycle: [],
			customfields: [],
		};

		for (const link of transformed._hyperlinks as IDataObject[]) {
			const ref = link.ref as string;
			const url = link._url as string;

			switch (ref) {
				case 'self':
					links.self = url;
					break;

				case 'refers-to':
				case 'referred-to-by':
				case 'depends-on':
				case 'depended-on-by':
				case 'parent':
				case 'child':
				case 'members':
				case 'member-of':
					// Ticket relationship links
					(links.tickets as IDataObject[]).push({
						type: ref,
						url,
						id: link.id,
						...(link.label && { label: link.label }),
					});
					break;

				case 'external':
					// External references
					(links.external as IDataObject[]).push({
						url,
						...(link.label && { label: link.label }),
					});
					break;

				case 'history':
					(links.actions as IDataObject).history = url;
					break;

				case 'correspond':
					(links.actions as IDataObject).correspond = url;
					break;

				case 'comment':
					(links.actions as IDataObject).comment = url;
					break;

				case 'lifecycle':
					// Lifecycle transitions (e.g., "Re-open")
					(links.lifecycle as IDataObject[]).push({
						label: link.label,
						from: link.from,
						to: link.to,
						update: link.update,
						url,
					});
					break;

				case 'customfield':
					// CustomField links
					(links.customfields as IDataObject[]).push({
						name: link.name,
						url,
						...(link.id && { id: link.id }),
					});
					break;

				default:
					// Any other link types, preserve as-is
					if (!links.other) {
						links.other = [];
					}
					(links.other as IDataObject[]).push(link);
			}
		}

		// Sort link collections
		if (Array.isArray(links.tickets)) {
			(links.tickets as IDataObject[]).sort(
				(a, b) =>
					String(a.type || '').localeCompare(String(b.type || '')) ||
					String(a.id || '').localeCompare(String(b.id || '')),
			);
		}
		if (Array.isArray(links.external)) {
			(links.external as IDataObject[]).sort(
				(a, b) =>
					String(a.label || '').localeCompare(String(b.label || '')) ||
					String(a.url || '').localeCompare(String(b.url || '')),
			);
		}
		if (Array.isArray(links.lifecycle)) {
			(links.lifecycle as IDataObject[]).sort(
				(a, b) =>
					String(a.label || '').localeCompare(String(b.label || '')) ||
					String(a.from || '').localeCompare(String(b.from || '')) ||
					String(a.to || '').localeCompare(String(b.to || '')),
			);
		}
		if (Array.isArray(links.customfields)) {
			(links.customfields as IDataObject[]).sort(
				(a, b) =>
					String(a.name || '').localeCompare(String(b.name || '')) ||
					String(a.id || '').localeCompare(String(b.id || '')),
			);
		}
		if (Array.isArray(links.other)) {
			(links.other as IDataObject[]).sort(
				(a, b) =>
					String((a as IDataObject).ref || '').localeCompare(String((b as IDataObject).ref || '')) ||
					String((a as IDataObject).id || '').localeCompare(String((b as IDataObject).id || '')),
			);
		}

		// Clean up empty arrays
		if ((links.tickets as IDataObject[]).length === 0) {
			delete links.tickets;
		}
		if ((links.external as IDataObject[]).length === 0) {
			delete links.external;
		}
		if ((links.lifecycle as IDataObject[]).length === 0) {
			delete links.lifecycle;
		}
		if ((links.customfields as IDataObject[]).length === 0) {
			delete links.customfields;
		}

		transformed.Links = links;
		delete transformed._hyperlinks;
	}

	// Apply simplify transformations if requested
	if (simplify) {
		// Flatten CustomFields and simplify user fields/arrays
		const simplified = simplifyResource(transformed, {
			userFields: USER_FIELDS,
			userArrayFields: USER_ARRAY_FIELDS,
			flattenCustomFields: true,
		});
		// Replace transformed with simplified (which has CustomFields deleted and flattened)
		Object.keys(transformed).forEach((key) => delete transformed[key]);
		Object.assign(transformed, simplified);

		// Simplify Queue to just the name
		if (
			transformed.Queue &&
			typeof transformed.Queue === 'object' &&
			(transformed.Queue as IDataObject).Name
		) {
			transformed.Queue = (transformed.Queue as IDataObject).Name;
		}
	}

	// Sort keys with preferred order
	return sortTicketKeysWithPreferredOrder(transformed);
}

/**
 * Transform a single queue object from RT REST2 API format
 * Similar to transformSingleTicket but for queue resources
 */
export function transformSingleQueue(queue: IDataObject, simplify: boolean): IDataObject {
	const transformed = { ...queue };

	// Transform CustomFields from array to dictionary (same as tickets)
	const normalizedQueueCF = normalizeCustomFields(transformed.CustomFields);
	if (normalizedQueueCF) {
		transformed.CustomFields = normalizedQueueCF;
	}

	// Apply simplify transformations if requested
	if (simplify) {
		const simplified = simplifyResource(transformed, {
			userFields: ['Creator', 'LastUpdatedBy'],
			flattenCustomFields: true,
		});
		Object.keys(transformed).forEach((key) => delete transformed[key]);
		Object.assign(transformed, simplified);
	}

	return sortQueueKeysWithPreferredOrder(transformed);
}

/**
 * Transform queue data from RT REST2 API format to a more usable format
 * This function is designed to work with n8n's declarative routing postReceive hook
 */
export async function transformQueueData(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	// Get the simplify parameter from the node (defaults to false if not present)
	const simplify = this.getNodeParameter('simplify', false) as boolean;

	return items.map((item) => {
		const transformed = transformSingleQueue(item.json, simplify);
		return {
			...item,
			json: transformed,
		};
	});
}

/**
 * Transform a single user object from RT REST2 API format
 * Similar to transformSingleQueue but for user resources
 */
export function transformSingleUser(user: IDataObject, simplify: boolean): IDataObject {
	const transformed = { ...user };

	// Transform CustomFields from array to dictionary (same as tickets/queues)
	const normalizedUserCF = normalizeCustomFields(transformed.CustomFields);
	if (normalizedUserCF) {
		transformed.CustomFields = normalizedUserCF;
	}

	// Apply simplify transformations if requested
	if (simplify) {
		const simplified = simplifyResource(transformed, {
			userFields: ['Creator', 'LastUpdatedBy'],
			flattenCustomFields: true,
		});
		Object.keys(transformed).forEach((key) => delete transformed[key]);
		Object.assign(transformed, simplified);
	}

	return sortUserKeysWithPreferredOrder(transformed);
}

/**
 * Transform user data from RT REST2 API format to a more usable format
 * This function is designed to work with n8n's declarative routing postReceive hook
 */
export async function transformUserData(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	// Get the simplify parameter from the node (defaults to false if not present)
	const simplify = this.getNodeParameter('simplify', false) as boolean;

	return items.map((item) => {
		const transformed = transformSingleUser(item.json, simplify);
		return {
			...item,
			json: transformed,
		};
	});
}

/**
 * Transform ticket data from RT REST2 API format to a more usable format
 * - Converts CustomFields array to a dictionary keyed by field name
 * - Unwraps single-value arrays to scalar values
 * - Converts empty arrays to null
 * - Transforms _hyperlinks array to Links object organized by type
 * - Optionally simplifies output by flattening CustomFields and simplifying user/queue fields
 * - Sorts keys with preferred fields first
 *
 * This function is designed to work with n8n's declarative routing postReceive hook
 */
export async function transformTicketData(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	let simplify = false;
	try {
		simplify = this.getNodeParameter('simplify', false) as boolean;
	} catch {
		// Simplify parameter may not exist
	}

	return items.map((item) => {
		const transformed = transformSingleTicket(item.json, simplify);
		return {
			...item,
			json: transformed,
		};
	});
}

/**
 * Get the list of fields to request for ticket operations
 * Based on python-rt library's comprehensive field list
 * Reference: https://raw.githubusercontent.com/python-rt/python-rt/refs/heads/master/rt/rest2.py
 */
export function getTicketFields(): string {
	return [
		'Subject',
		'Description',
		'Type',
		'Status',
		'SLA',
		'Created',
		'LastUpdated',
		'Creator',
		'LastUpdatedBy',
		'Owner',
		'Requestors',
		'Cc',
		'AdminCc',
		'CustomFields',
		'CustomRoles',
		'Queue',
		'TimeEstimated',
		'TimeWorked',
		'TimeLeft',
		'Started',
		'Starts',
		'Due',
		'Resolved',
		'Told',
		'Priority',
		'InitialPriority',
		'FinalPriority',
	].join(',');
}

/**
 * Get the expanded field parameters for linked objects (users, queues, etc.)
 * This ensures that related objects return useful information instead of just IDs
 * Based on python-rt library's field expansion patterns
 */
export function getExpandedFieldParams(): IDataObject {
	return {
		'fields[Queue]': 'id,Name,Description',
		'fields[Creator]': 'id,Name,RealName,EmailAddress',
		'fields[LastUpdatedBy]': 'id,Name,RealName,EmailAddress',
		'fields[Owner]': 'id,Name,RealName,EmailAddress',
		'fields[Requestors]': 'id,Name,RealName,EmailAddress',
		'fields[Cc]': 'id,Name,RealName,EmailAddress',
		'fields[AdminCc]': 'id,Name,RealName,EmailAddress',
	};
}

/**
 * Handle RT API errors in declarative routing hooks
 * RT typically returns 200 OK with an error message in the body for many errors
 */
export async function handleRtApiError(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const responseBody = response.body as JsonObject | string;

	let errorMessage = `Request Tracker API Error: ${response.statusMessage || 'Unknown error'}`;
	const errorDescription = 'The Request Tracker API returned an issue.';

	if (typeof responseBody === 'string') {
		// Check for common RT error messages in plain text body
		if (responseBody.includes('No matching results') || responseBody.includes('not found')) {
			throw new NodeApiError(
				this.getNode(),
				{ message: responseBody },
				{
					message: responseBody,
					description:
						'The query returned no results or the specified object was not found.',
				},
			);
		}
		errorMessage = responseBody;
	} else if (typeof responseBody === 'object' && responseBody !== null) {
		// If it's an object, try to find a message field
		const message =
			responseBody.message || responseBody.error || JSON.stringify(responseBody);
		if (typeof message === 'string') {
			errorMessage = message;
		}
	}

	// For actual HTTP errors (4xx, 5xx)
	if (
		String(response.statusCode).startsWith('4') ||
		String(response.statusCode).startsWith('5')
	) {
		throw new NodeApiError(
			this.getNode(),
			response as unknown as JsonObject,
			{
				message: `HTTP Error ${response.statusCode}: ${errorMessage}`,
				description: errorDescription,
			},
		);
	} else if (
		typeof responseBody === 'string' &&
		responseBody.startsWith('RT/') &&
		responseBody.includes(' Error: ')
	) {
		// Handle cases where RT returns 200 OK but the body indicates an error
		// e.g., "RT/5.0.1 200 Ok (Error: User 'foo' not found)"
		const coreMessageMatch = responseBody.match(/Error: (.*)/);
		const coreMessage = coreMessageMatch ? coreMessageMatch[1] : responseBody;
		throw new NodeApiError(
			this.getNode(),
			{ message: coreMessage },
			{
				message: coreMessage,
				description: 'Request Tracker reported an error in its response body.',
			},
		);
	}

	return items;
}

/**
 * Determine whether a MIME type should be treated as textual content.
 * Uses regex patterns to match:
 * - All text/* types
 * - Types with +xml, +json, +yaml, +html suffixes
 * - Known textual application/ types (json, xml, javascript, yaml, etc.)
 * - Message types (rfc822, etc.)
 */
function isTextLikeContentType(contentType: string): boolean {
	const normalized = contentType.toLowerCase().split(';')[0].trim();

	// All text/* types
	if (normalized.startsWith('text/')) {
		return true;
	}

	// Types with structured data suffixes
	if (/\+(xml|json|yaml|yml|html|xhtml)$/.test(normalized)) {
		return true;
	}

	// Known textual application/ types
	const textualApplicationTypes = [
		'application/json',
		'application/yaml',
		'application/yml',
		'application/xml',
		'application/xhtml+xml',
		'application/javascript',
		'application/x-javascript',
		'application/ecmascript',
		'application/x-www-form-urlencoded',
		'application/ld+json',
		'application/manifest+json',
		'application/vnd.api+json',
		'application/graphql',
		'application/x-sh',
		'application/x-csh',
		'application/sql',
	];

	if (textualApplicationTypes.includes(normalized)) {
		return true;
	}

	// Message types
	if (normalized.startsWith('message/')) {
		return true;
	}

	return false;
}

/**
 * Extract transaction ID from TransactionId field
 * Handles both object format {type: "transaction", id: "123"} and string format "123"
 * Used by: processAttachment, processAttachments (when simplify mode enabled)
 */
function extractTransactionId(transactionData: unknown): string | number | IDataObject {
	if (typeof transactionData === 'object' && transactionData !== null) {
		const data = transactionData as IDataObject;
		if (data.type === 'transaction' && data.id) {
			return data.id as string | number;
		}
		return data;
	}
	return transactionData as string | number;
}

/**
 * Create simplified attachment metadata for simplify mode
 * Returns: { id, Filename, ContentType, ContentLength, TransactionId?, Creator?, Content?, binaryPropertyName? }
 * Used by: processTransactions (multiple locations), processAttachment, processAttachments
 */
function createSimplifiedAttachmentMetadata(
	metadata: IDataObject,
	options: {
		includeContent?: boolean;
		includeTransactionId?: boolean;
		binaryPropertyName?: string;
	} = {},
): IDataObject {
	const simplified: IDataObject = {
		id: metadata.id,
		Filename: metadata.Filename,
		ContentType: metadata.ContentType,
		ContentLength: metadata.ContentLength,
	};

	// Extract and simplify TransactionId if present
	if (options.includeTransactionId && metadata.TransactionId) {
		simplified.TransactionId = extractTransactionId(metadata.TransactionId);
	}

	// Simplify Creator if present
	if (metadata.Creator) {
		simplified.Creator = simplifyUserObject(metadata.Creator as IDataObject);
	}

	// Include Content if present and requested
	if (options.includeContent && metadata.Content !== undefined) {
		simplified.Content = metadata.Content;
	}

	// Include binary property name if provided
	if (options.binaryPropertyName) {
		simplified.binaryPropertyName = options.binaryPropertyName;
	}

	return simplified;
}

/**
 * Normalize attachment metadata fields for consistency
 * - Ensures ContentLength is a number (parses strings, defaults to 0)
 * - Ensures id is a string
 * Used by: processSingleAttachment, processTransactions, processAttachments
 */
function normalizeAttachmentMetadata(metadata: IDataObject): IDataObject {
	const normalized = { ...metadata };

	// Normalize ContentLength to number
	if (normalized.ContentLength !== undefined && normalized.ContentLength !== null) {
		if (typeof normalized.ContentLength === 'string') {
			const parsed = parseInt(normalized.ContentLength, 10);
			normalized.ContentLength = !Number.isNaN(parsed) ? parsed : 0;
		} else if (typeof normalized.ContentLength !== 'number') {
			normalized.ContentLength = 0;
		}
	} else {
		normalized.ContentLength = 0;
	}

	// Ensure id is a string for consistency
	if (normalized.id !== undefined) {
		normalized.id = String(normalized.id);
	}

	return normalized;
}

/**
 * Build a stable binary property name for an attachment.
 */
function buildBinaryPropertyName(metadata: IDataObject, usedNames: Set<string>): string {
	const idPart = metadata.id ? String(metadata.id) : Date.now().toString();
	const filename = typeof metadata.Filename === 'string' ? metadata.Filename : '';
	const baseName = filename ? filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '') : `attachment_${idPart}`;

	let candidate = baseName || `attachment_${idPart}`;
	let suffix = 1;

	while (usedNames.has(candidate)) {
		candidate = `${baseName || `attachment_${idPart}`}_${suffix++}`;
	}

	usedNames.add(candidate);
	return candidate;
}

/**
 * Core function to process a single attachment's content from /attachments endpoint
 * RT API /attachments returns Content as raw/plain text (not encoded)
 * Handles both text and binary attachments from RT API
 *
 * @param rawContent - Raw content string from RT API /attachments endpoint
 * @param metadata - Attachment metadata
 * @param options - Processing options
 * @returns Processed metadata and optional binary data
 */
function processSingleAttachmentContent(
	rawContent: string | undefined,
	metadata: IDataObject,
	options: {
		debug: boolean;
		logger: Logger;
	},
): { metadata: IDataObject; binaryData?: IBinaryData } {
	const { debug, logger } = options;

	// If no content or empty content, return metadata only
	const contentLength = typeof metadata.ContentLength === 'number' ? metadata.ContentLength : 0;
	if (!rawContent || contentLength === 0 || rawContent.length === 0) {
		if (debug) {
			logger.info(`[RT Debug] Skipping empty content for attachment ${metadata.id}`);
		}
		return { metadata };
	}

	// Determine content type
	let contentType = typeof metadata.ContentType === 'string' ? metadata.ContentType : 'application/octet-stream';
	if (typeof metadata.Headers === 'string') {
		const originalContentTypeMatch = metadata.Headers.match(/X-RT-Original-Content-Type:\s*([^\n]+)/i);
		if (originalContentTypeMatch) {
			contentType = originalContentTypeMatch[1].trim();
		}
	}

	const normalizedContentType = contentType.toLowerCase();
	const isText = isTextLikeContentType(normalizedContentType);

	if (isText) {
		// Text attachments - store content directly in Content field
		metadata.Content = rawContent;
		if (debug) {
			logger.info(`[RT Debug] Stored text content for ${metadata.id} (${rawContent.length} chars)`);
		}
		return { metadata };
	} else {
		// Binary attachments - RT returns raw binary data as a string
		// Convert to Buffer preserving raw bytes, then to base64 for n8n
		const filename = (metadata.Filename as string) || `attachment_${metadata.id}`;
		const binaryBuffer = Buffer.from(rawContent, 'latin1');

		const binaryData: IBinaryData = {
			data: binaryBuffer.toString('base64'),
			mimeType: contentType,
			fileName: filename,
		};

		if (debug) {
			logger.info(`[RT Debug] Stored binary data for ${filename} (${rawContent.length} chars -> ${binaryBuffer.length} bytes)`);
		}

		return { metadata, binaryData };
	}
}

/**
 * Fetch attachments from RT API with configurable options
 * Handles pagination automatically
 * Returns { items, total } where total is from the first page response
 */
async function fetchAttachments(
	this: IExecuteSingleFunctions,
	transactionId: string,
	options: {
		includeContent: boolean;
		fetchAll: boolean;
	},
): Promise<{ items: IDataObject[], total: number | null }> {
	const debug = this.getNodeParameter('nodeDebug', false) as boolean;
	const logger = this.logger;

	const credentials = await this.getCredentials('requestTrackerApi');
	const allowUnauthorizedCerts = credentials.allowUnauthorizedCerts as boolean;
	const baseUrl = credentials.rtInstanceUrl as string;

	const attachmentsUrl = `${baseUrl}/REST/2.0/transaction/${transactionId}/attachments`;

	// Build fields list based on whether we need content
	const baseFields = 'id,Subject,Filename,ContentType,ContentLength,Created,Creator';
	const fields = options.includeContent ? `${baseFields},Content` : baseFields;

	if (debug) {
		logger.info(`[RT Debug] Fetching attachments from: ${attachmentsUrl} (includeContent: ${options.includeContent}, fetchAll: ${options.fetchAll})`);
	}

	try {
		const allItems: IDataObject[] = [];
		let page = 1;
		let hasMore = true;
		let totalCount: number | null = null;

		while (hasMore) {
			const response = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				'requestTrackerApi',
				{
					method: 'GET',
					url: attachmentsUrl,
					qs: {
						fields,
						'fields[Creator]': 'id,Name,RealName,EmailAddress',
						page: page,
						per_page: 100,
					},
					json: true,
					skipSslCertificateValidation: allowUnauthorizedCerts,
				},
			)) as IDataObject;

			const items = (response.items as IDataObject[]) || [];
			allItems.push(...items);

			// Capture total from first page (RT may return null for total)
			if (page === 1 && response.count !== undefined) {
				totalCount = typeof response.count === 'number' ? response.count : null;
			}

			if (debug) {
				logger.info(`[RT Debug] Page ${page}: Found ${items.length} attachments${options.includeContent ? ' with content' : ''}`);
			}

			// If not fetching all, return first page only (for content extraction)
			if (!options.fetchAll) {
				break;
			}

			// Check if there are more pages
			const perPage = (response.per_page as number) || 20;
			const count = items.length;

			hasMore = count === perPage;
			page++;
		}

		if (debug) {
			logger.info(`[RT Debug] Total attachments found: ${allItems.length} (reported total: ${totalCount})`);
		}

		return { items: allItems, total: totalCount };
	} catch (error) {
		if (debug) {
			logger.error(`[RT Debug] Error fetching attachments: ${(error as Error).message}`);
		}
		return { items: [], total: null };
	}
}

/**
 * Fetch attachments in bulk for multiple transactions using global /attachments endpoint
 * Uses POST /attachments with TransactionId IN filter for optimal performance
 * Returns a Map of transactionId -> attachment[] for efficient lookup
 */
async function fetchAttachmentsBulk(
	this: IExecuteSingleFunctions,
	transactionIds: string[],
	options: {
		includeContent: boolean;
	},
): Promise<Map<string, IDataObject[]>> {
	const debug = this.getNodeParameter('nodeDebug', false) as boolean;
	const logger = this.logger;

	if (transactionIds.length === 0) {
		return new Map();
	}

	const credentials = await this.getCredentials('requestTrackerApi');
	const allowUnauthorizedCerts = credentials.allowUnauthorizedCerts as boolean;
	const baseUrl = credentials.rtInstanceUrl as string;

	const attachmentsUrl = `${baseUrl}/REST/2.0/attachments`;

	// Build fields list based on whether we need content
	const baseFields = 'id,Subject,Filename,ContentType,ContentLength,Created,Creator,TransactionId';
	const fields = options.includeContent ? `${baseFields},Content` : baseFields;

	if (debug) {
		logger.info(`[RT Debug] Bulk fetching attachments for ${transactionIds.length} transactions (includeContent: ${options.includeContent})`);
		logger.info(`[RT Debug] Transaction IDs: ${transactionIds.join(', ')}`);
	}

	try {
		const allItems: IDataObject[] = [];
		let page = 1;
		let hasMore = true;

		// Build filter body for TransactionId IN [...]
		const filterBody = [
			{
				field: 'TransactionId',
				operator: 'IN',
				value: transactionIds.map(id => parseInt(id, 10)),
			},
		];

		while (hasMore) {
			const response = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				'requestTrackerApi',
				{
					method: 'POST',
					url: attachmentsUrl,
					headers: {
						'Content-Type': 'application/json',
					},
					qs: {
						fields,
						'fields[Creator]': 'id,Name,RealName,EmailAddress',
						page,
						per_page: 100,
					},
					body: filterBody,
					json: true,
					skipSslCertificateValidation: allowUnauthorizedCerts,
				},
			)) as IDataObject;

			const items = (response.items as IDataObject[]) || [];
			allItems.push(...items);

			if (debug) {
				logger.info(`[RT Debug] Bulk fetch page ${page}: Found ${items.length} attachments${options.includeContent ? ' with content' : ''}`);
			}

			// Check if there are more pages
			const perPage = (response.per_page as number) || 100;
			const count = items.length;

			hasMore = count === perPage;
			page++;
		}

		if (debug) {
			logger.info(`[RT Debug] Total attachments fetched in bulk: ${allItems.length}`);
		}

		// Build a Map of transactionId -> attachments for efficient lookup
		const attachmentsByTransaction = new Map<string, IDataObject[]>();

		for (const attachment of allItems) {
			// Extract transaction ID - handle both nested and flattened formats
			let transactionId: string | undefined;

			if (attachment.TransactionId) {
				// Handle different formats:
				// 1. Nested: {type: "transaction", id: "123"}
				// 2. Flattened: "123"
				if (typeof attachment.TransactionId === 'object') {
					const txObj = attachment.TransactionId as IDataObject;
					transactionId = String(txObj.id || '');
				} else {
					transactionId = String(attachment.TransactionId);
				}
			}

			if (transactionId) {
				if (!attachmentsByTransaction.has(transactionId)) {
					attachmentsByTransaction.set(transactionId, []);
				}
				attachmentsByTransaction.get(transactionId)!.push(attachment);
			}
		}

		if (debug) {
			logger.info(`[RT Debug] Grouped attachments by transaction: ${attachmentsByTransaction.size} transactions have attachments`);
		}

		return attachmentsByTransaction;
	} catch (error) {
		if (debug) {
			logger.error(`[RT Debug] Error in bulk attachment fetch: ${(error as Error).message}`);
		}
		// Return empty map on error - will fall back to per-transaction fetching if needed
		return new Map();
	}
}

/**
 * Process transactions (history items) to include their attachments
 * This is designed to work with n8n's declarative routing postReceive hook
 * Can be used for both single transaction get and getMany operations
 */
export async function processTransactions(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const debug = this.getNodeParameter('nodeDebug', false) as boolean;
	const logger = this.logger;
	const simplify = this.getNodeParameter('simplify', 0) as boolean;
	const additionalOptions = this.getNodeParameter('additionalOptions', 0, {}) as IDataObject;
	const includeContent =
		additionalOptions.includeContent === undefined ? false : Boolean(additionalOptions.includeContent);
	const includeAttachments =
		additionalOptions.includeAttachments === undefined
			? false
			: Boolean(additionalOptions.includeAttachments);

	if (debug) {
		logger.info(
			`[RT Debug] Processing ${items.length} transactions (includeContent: ${includeContent}, includeAttachments: ${includeAttachments}, simplify: ${simplify})`,
		);
	}

	// OPTIMIZATION: Collect all transaction IDs that need attachments and fetch in bulk
	const contentTypes: string[] = Array.from(TRANSACTION_CONTENT_TYPES);
	const needsAttachments = includeAttachments || includeContent;
	let bulkAttachmentsByTransaction = new Map<string, IDataObject[]>();

	if (needsAttachments) {
		// Collect transaction IDs for content-type transactions
		const transactionIdsNeedingAttachments: string[] = [];
		for (const item of items) {
			const transaction = item.json;
			const transactionType = transaction.Type as string;
			const isContentType = contentTypes.includes(transactionType);
			if (isContentType) {
				transactionIdsNeedingAttachments.push(String(transaction.id));
			}
		}

		// Bulk fetch attachments for all transactions in one request
		if (transactionIdsNeedingAttachments.length > 0) {
			if (debug) {
				logger.info(`[RT Debug] Bulk fetching attachments for ${transactionIdsNeedingAttachments.length} transactions`);
			}
			bulkAttachmentsByTransaction = await fetchAttachmentsBulk.call(this, transactionIdsNeedingAttachments, {
				includeContent: includeContent || includeAttachments, // Fetch content when EITHER flag is true (avoids extra /attachment/{id} calls)
			});
		}
	}

	// Process transactions with controlled concurrency
	const TRANSACTION_CONCURRENCY = 12;
	const processedItems: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i += TRANSACTION_CONCURRENCY) {
		const batch = items.slice(i, i + TRANSACTION_CONCURRENCY);

		if (debug) {
			logger.info(`[RT Debug] Processing transaction batch ${Math.floor(i / TRANSACTION_CONCURRENCY) + 1}: ${batch.length} transactions`);
		}

		const batchResults = await Promise.all(
			batch.map(async (item) => {
				const transaction = item.json;

				if (debug) {
					logger.info(`[RT Debug] Processing transaction ${transaction.id}, Type: ${transaction.Type}`);
				}

				// Determine if this transaction type should have content extracted
				const transactionType = transaction.Type as string;
				const isContentType = contentTypes.includes(transactionType);

				// Get attachments from bulk fetch or fetch individually if needed
				let attachmentsList: IDataObject[] = [];
				let attachmentsTotal: number | null = null;
				let extractedContent: string | undefined;
				let contentAttachmentId: string | undefined;

				if (isContentType) {
					const transactionId = String(transaction.id);

					// Use bulk-fetched attachments if available
					const bulkAttachments = bulkAttachmentsByTransaction.get(transactionId);

					if (bulkAttachments !== undefined) {
						// Using bulk-fetched attachments
						attachmentsList = bulkAttachments;
						attachmentsTotal = bulkAttachments.length; // Note: bulk fetch doesn't provide total, use length

						if (debug) {
							logger.info(
								`[RT Debug] Using ${attachmentsList.length} bulk-fetched attachments for transaction ${transactionId}`,
							);
						}

						// If includeContent, extract from the attachments we already have
						if (includeContent && attachmentsList.length > 0) {
							// Find best text attachment (prefer text/html over text/plain)
							let htmlAttachment: IDataObject | undefined;
							let plainAttachment: IDataObject | undefined;

							for (const att of attachmentsList) {
								const contentType = (att.ContentType as string || '').toLowerCase();
								const isMultipart = contentType.startsWith('multipart/');
								if (isMultipart) continue;

								if (contentType.includes('text/html')) {
									htmlAttachment = att;
								} else if (contentType.includes('text/plain') && !plainAttachment) {
									plainAttachment = att;
								}
							}

							const preferredAttachment = htmlAttachment || plainAttachment;
							if (preferredAttachment) {
								contentAttachmentId = String(preferredAttachment.id);

								// Content is always available from bulk fetch (line 1099 optimization)
								if (typeof preferredAttachment.Content === 'string') {
									const rawContent = preferredAttachment.Content as string;
									// Content from /attachments endpoint is already decoded by RT (no additional base64 layer)
									if (rawContent && rawContent.length > 0) {
										extractedContent = rawContent;
										if (debug) {
											logger.info(`[RT Debug] Using bulk-fetched ${preferredAttachment.ContentType} attachment ${contentAttachmentId} for content extraction (${extractedContent.length} chars)`);
										}
									}
								}
							}
						}
					} else if (needsAttachments) {
						// Fallback: bulk fetch failed or transaction not included - fetch individually
						if (debug) {
							logger.info(`[RT Debug] Bulk fetch unavailable for transaction ${transactionId}, falling back to individual fetch`);
						}

						if (includeAttachments) {
							// Fetch ALL attachments with content in one request per transaction
							const attachmentsResult = await fetchAttachments.call(this, transactionId, {
								includeContent: true,
								fetchAll: true,
							});
							attachmentsList = attachmentsResult.items;
							attachmentsTotal = attachmentsResult.total;

							// If includeContent, extract from the attachments we already have
							if (includeContent && attachmentsList.length > 0) {
								let htmlAttachment: IDataObject | undefined;
								let plainAttachment: IDataObject | undefined;

								for (const att of attachmentsList) {
									const contentType = (att.ContentType as string || '').toLowerCase();
									const isMultipart = contentType.startsWith('multipart/');
									if (isMultipart) continue;

									if (contentType.includes('text/html')) {
										htmlAttachment = att;
									} else if (contentType.includes('text/plain') && !plainAttachment) {
										plainAttachment = att;
									}
								}

								const preferredAttachment = htmlAttachment || plainAttachment;
								if (preferredAttachment && typeof preferredAttachment.Content === 'string') {
									contentAttachmentId = String(preferredAttachment.id);
									const rawContent = preferredAttachment.Content as string;
									if (rawContent && rawContent.length > 0) {
										extractedContent = rawContent;
									}
								}
							}
						} else {
							// Fetch attachments (with content if needed - determined by line 1099 optimization)
							const attachmentsResult = await fetchAttachments.call(this, transactionId, {
								includeContent: includeContent,
								fetchAll: false,
							});
							attachmentsList = attachmentsResult.items;
							attachmentsTotal = attachmentsResult.total;

							// If includeContent, extract from the attachments we already fetched
							if (includeContent && attachmentsList.length > 0) {
								let htmlAttachment: IDataObject | undefined;
								let plainAttachment: IDataObject | undefined;

								for (const att of attachmentsList) {
									const contentType = (att.ContentType as string || '').toLowerCase();
									const isMultipart = contentType.startsWith('multipart/');
									if (isMultipart) continue;

									if (contentType.includes('text/html')) {
										htmlAttachment = att;
									} else if (contentType.includes('text/plain') && !plainAttachment) {
										plainAttachment = att;
									}
								}

								const preferredAttachment = htmlAttachment || plainAttachment;
								if (preferredAttachment && typeof preferredAttachment.Content === 'string') {
									contentAttachmentId = String(preferredAttachment.id);
									const rawContent = preferredAttachment.Content as string;
									if (rawContent && rawContent.length > 0) {
										extractedContent = rawContent;
									}
								}
							}
						}
					}
				}

				let processedItem: IDataObject = {
					id: transaction.id,
					Type: transaction.Type,
					Created: transaction.Created,
					Description: transaction.Description,
					Creator: transaction.Creator,
					_url: transaction._url,
				};

				// Extract ticket ID from Object field if present
				// Handle both formats:
				// 1. Object field (nested structure from /transaction/{id}): {type: "ticket", id: "123"}
				// 2. ObjectId field (flattened from /transactions): "123" with separate ObjectType: "RT::Ticket"
				if (transaction.Object && typeof transaction.Object === 'object') {
					const objectData = transaction.Object as IDataObject;
					if (objectData.type === 'ticket' && objectData.id) {
						processedItem.TicketId = objectData.id;
					}
				} else if (transaction.ObjectId && transaction.ObjectType) {
					// Flattened format from /transactions endpoint
					const objectType = String(transaction.ObjectType);
					if (objectType === 'RT::Ticket' || objectType.toLowerCase().includes('ticket')) {
						processedItem.TicketId = transaction.ObjectId;
					}
				}

				// Add field change information if present (for Set, CustomField, etc.)
				if (transaction.Field !== undefined) {
					processedItem.Field = transaction.Field;
				}
				if (transaction.OldValue !== undefined) {
					processedItem.OldValue = transaction.OldValue;
				}
				if (transaction.NewValue !== undefined) {
					processedItem.NewValue = transaction.NewValue;
				}
				if (transaction.Data !== undefined) {
					processedItem.Data = transaction.Data;
				}

				const attachmentsAggregate: IDataObject[] = [];
				const usedBinaryNames = new Set<string>();
				let binaryData = item.binary ? { ...item.binary } : undefined;

				// Process all attachments for metadata or full download
				if (includeAttachments) {
					// When includeAttachments=true, we already have ALL attachments with content from fetchAttachmentsListWithContent
					// Process them using content from /attachments endpoint (already decoded by RT, no additional base64 layer)
					const attachmentsToProcess = attachmentsList.filter(att => String(att.id) !== contentAttachmentId);

					if (debug) {
						logger.info(`[RT Debug] Processing ${attachmentsToProcess.length} attachments with content already fetched`);
					}

					for (const attData of attachmentsToProcess) {
						const contentType = (attData.ContentType as string || '').toLowerCase();
						const isText = isTextLikeContentType(contentType);
						const rawContent = typeof attData.Content === 'string' ? (attData.Content as string) : undefined;

						// Build metadata (remove Content field, normalize fields)
						const metadata = normalizeAttachmentMetadata(attData);
						delete metadata.Content;
						const contentLength = typeof metadata.ContentLength === 'number' ? metadata.ContentLength : 0;
						const hasFilename = typeof metadata.Filename === 'string' && metadata.Filename.trim().length > 0;

						// Skip empty attachments without filenames (likely placeholder/empty records)
						if (contentLength === 0 && !hasFilename) {
							if (debug) {
								logger.info(`[RT Debug] Skipping empty attachment ${metadata.id} with no filename`);
							}
							continue;
						}

						// Skip empty attachments with content missing
						if (!rawContent || rawContent.length === 0) {
							const metadataOnly = simplify
								? createSimplifiedAttachmentMetadata(metadata)
								: metadata;
							attachmentsAggregate.push(metadataOnly);
							continue;
						}

						// Process content from /attachments endpoint (already decoded by RT, no additional base64 layer)
						if (isText) {
							// Text attachment - store content directly
							// Add content to metadata before simplification
							metadata.Content = rawContent;
							const textData = simplify
								? createSimplifiedAttachmentMetadata(metadata, { includeContent: true })
								: metadata;
							attachmentsAggregate.push(textData);
						} else {
							// Binary attachment - convert from latin1 to Buffer for n8n binary data
							const binaryPropertyName = buildBinaryPropertyName(metadata, usedBinaryNames);
							const fileName =
								typeof metadata.Filename === 'string' && metadata.Filename.trim().length > 0
									? metadata.Filename
									: binaryPropertyName;
							const mimeType =
								typeof metadata.ContentType === 'string' && metadata.ContentType
									? metadata.ContentType
									: undefined;

							// Content from /attachments is raw binary as string, convert to Buffer
							const binaryBuffer = Buffer.from(rawContent, 'latin1');
							const preparedBinary = await this.helpers.prepareBinaryData(
								binaryBuffer,
								fileName,
								mimeType,
							);

							if (!binaryData) {
								binaryData = {};
							}
							binaryData[binaryPropertyName] = preparedBinary;

							const binaryMetadata = simplify
								? createSimplifiedAttachmentMetadata(metadata, { binaryPropertyName })
								: {
									...metadata,
									binaryPropertyName,
								};
							attachmentsAggregate.push(binaryMetadata);
						}
					}
				} else {
					// Show metadata only (no downloads needed)
					for (const attMetadata of attachmentsList) {
						const attachmentId = String(attMetadata.id);

						// Skip the attachment used for content extraction
						if (attachmentId === contentAttachmentId) {
							continue;
						}

						// Skip empty attachments without filenames (likely placeholder/empty records)
						const contentLength = typeof attMetadata.ContentLength === 'number' ? attMetadata.ContentLength : 0;
						const hasFilename = typeof attMetadata.Filename === 'string' && (attMetadata.Filename as string).trim().length > 0;
						if (contentLength === 0 && !hasFilename) {
							if (debug) {
								logger.info(`[RT Debug] Skipping empty attachment ${attachmentId} with no filename`);
							}
							continue;
						}

						const attachmentData = simplify
							? createSimplifiedAttachmentMetadata(attMetadata)
							: attMetadata;
						attachmentsAggregate.push(attachmentData);
					}
				}

				// Set Content field
				if (includeContent && isContentType && extractedContent) {
					processedItem.Content = extractedContent;
				}

				// Always include Attachments array and count info
				const sortedAttachments = attachmentsAggregate.sort(
					(a, b) =>
						String(a.Filename || '').localeCompare(String(b.Filename || '')) ||
						String(a.id || '').localeCompare(String(b.id || '')),
				);
				processedItem.Attachments = sortedAttachments;
				processedItem.AttachmentsTotal = attachmentsTotal;
				processedItem.AttachmentsShowing = sortedAttachments.length;

				// Preserve other fields from the transaction payload
				for (const [key, value] of Object.entries(transaction)) {
					if (
						[
							'id',
							'Type',
							'Created',
							'Description',
							'Creator',
							'_url',
							'_hyperlinks',
							'Content',
							'Attachments',
						].includes(key)
					) {
						continue;
					}
					processedItem[key] = value;
				}

				// Apply simplification if requested
				if (simplify) {
					// Keep only essential fields
					const simplifiedItem: IDataObject = {
						id: processedItem.id,
						Type: processedItem.Type,
						Created: processedItem.Created,
					};

					// Include TicketId if present (extracted from Object field earlier)
					if (processedItem.TicketId) {
						simplifiedItem.TicketId = processedItem.TicketId;
					}

					// Add field change info if present (for Set, CustomField, etc.)
					if (processedItem.Field !== undefined) {
						simplifiedItem.Field = processedItem.Field;
					}
					if (processedItem.OldValue !== undefined) {
						simplifiedItem.OldValue = processedItem.OldValue;
					}
					if (processedItem.NewValue !== undefined) {
						simplifiedItem.NewValue = processedItem.NewValue;
					}

					// Add description if present
					if (processedItem.Description !== undefined) {
						simplifiedItem.Description = processedItem.Description;
					}

					// Include Content if present (before Attachments)
					if (processedItem.Content !== undefined) {
						simplifiedItem.Content = processedItem.Content;
					}

					// Simplify Creator using existing helper
					if (processedItem.Creator) {
						simplifiedItem.Creator = simplifyUserObject(processedItem.Creator as IDataObject);
					}

					// Always include Attachments
					simplifiedItem.Attachments = processedItem.Attachments;

					processedItem = simplifiedItem;
				}

				const outputItem: INodeExecutionData = {
					...item,
					json: processedItem,
				};

				if (binaryData && Object.keys(binaryData).length > 0) {
					outputItem.binary = binaryData;
				} else if (outputItem.binary) {
					delete outputItem.binary;
				}

				return outputItem;
			})
		);

		processedItems.push(...batchResults);
	}

	return processedItems;
}

/**
 * Backward compatibility alias for processTransactions
 * @deprecated Use processTransactions instead
 */
export const processTicketComments = processTransactions;

/**
 * Process ticket history/transactions for the Get History operation
 * This is an alias for processTransactions with a more specific name
 */
export const processTicketHistory = processTransactions;

/**
 * Process multiple attachments response - decode base64 content and format as n8n binary data
 * Used for Get Many operation (multiple attachments)
 * Handles optional content download based on additionalOptions.downloadContent parameter
 */
export async function processAttachments(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const debug = this.getNodeParameter('nodeDebug', false) as boolean;
	const logger = this.logger;
	const simplify = this.getNodeParameter('simplify', 0) as boolean;
	const additionalOptions = this.getNodeParameter('additionalOptions', 0, {}) as IDataObject;
	// Default to true if downloadContent not specified (e.g., "Attachment > Get" operation)
	const downloadContent = additionalOptions.downloadContent === undefined ? true : additionalOptions.downloadContent === true;

	if (debug) {
		logger.info(`[RT Debug] Processing ${items.length} attachments (downloadContent: ${downloadContent}, simplify: ${simplify})`);
	}

	const processedItems: INodeExecutionData[] = [];

	for (const item of items) {
		const attachment = item.json;

		// Normalize metadata fields
		let metadata = normalizeAttachmentMetadata(attachment);

		// Process content if downloadContent is enabled
		const rawContent = downloadContent && typeof attachment.Content === 'string'
			? (attachment.Content as string)
			: undefined;

		// Remove Content from metadata (will be re-added by processSingleAttachmentContent if text)
		delete metadata.Content;

		// Process the attachment content using core function
		const result = processSingleAttachmentContent(rawContent, metadata, {
			debug,
			logger,
		});

		metadata = result.metadata;

		// Prepare binary data using n8n helper for proper metadata enrichment
		let binaryData: IBinaryData | undefined;
		if (result.binaryData) {
			const filename = (metadata.Filename as string) || `attachment_${metadata.id}`;
			const contentType = typeof metadata.ContentType === 'string' ? metadata.ContentType : 'application/octet-stream';

			// Convert base64 back to Buffer for prepareBinaryData
			const binaryBuffer = Buffer.from(result.binaryData.data, 'base64');
			binaryData = await this.helpers.prepareBinaryData(
				binaryBuffer,
				filename,
				contentType,
			);
		}

		// Apply simplification if requested
		let finalMetadata = metadata;
		if (simplify) {
			finalMetadata = createSimplifiedAttachmentMetadata(metadata, {
				includeContent: metadata.Content !== undefined,
				includeTransactionId: true,
			});
		}

		const outputItem: INodeExecutionData = {
			json: finalMetadata,
			binary: binaryData ? { data: binaryData } : undefined,
		};

		processedItems.push(outputItem);
	}

	// Sort processed attachments by filename (then id) for stable ordering
	processedItems.sort(
		(a, b) =>
			String((a.json as IDataObject).Filename || '').localeCompare(
				String((b.json as IDataObject).Filename || ''),
			) ||
			String((a.json as IDataObject).id || '').localeCompare(
				String((b.json as IDataObject).id || ''),
			),
	);

	if (debug) {
		logger.info(`[RT Debug] Processed ${processedItems.length} attachment(s)`);
	}

	return processedItems;
}

/**
 * Debug preSend hook to log HTTP request details
 * Logs the complete request information when nodeDebug setting is enabled
 */
export async function debugPreSendRequest(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const nodeDebug = this.getNode().parameters.nodeDebug as boolean;

	if (nodeDebug) {
		const logger = this.logger;
		logger.info('[RT Debug] ===== HTTP Request =====');
		logger.info(`[RT Debug] Method: ${requestOptions.method}`);
		logger.info(`[RT Debug] URL: ${requestOptions.baseURL}${requestOptions.url}`);

		if (requestOptions.qs && Object.keys(requestOptions.qs).length > 0) {
			logger.info('[RT Debug] Query Parameters:');
			logger.info(JSON.stringify(requestOptions.qs, null, 2));
		}

		if (requestOptions.headers && Object.keys(requestOptions.headers).length > 0) {
			logger.info('[RT Debug] Headers:');
			const sanitizedHeaders = { ...requestOptions.headers };
			// Hide sensitive authorization header value
			if (sanitizedHeaders.Authorization) {
				sanitizedHeaders.Authorization = '[REDACTED]';
			}
			logger.info(JSON.stringify(sanitizedHeaders, null, 2));
		}

		if (requestOptions.body) {
			logger.info('[RT Debug] Body:');
			logger.info(JSON.stringify(requestOptions.body, null, 2));
		}

		logger.info('[RT Debug] ========================');
	}

	return requestOptions;
}

/**
 * Debug postReceive hook to log HTTP response details
 * Logs the complete response information when nodeDebug setting is enabled
 */
export async function debugPostReceiveResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const nodeDebug = this.getNode().parameters.nodeDebug as boolean;

	if (nodeDebug) {
		const logger = this.logger;
		logger.info('[RT Debug] ===== HTTP Response =====');
		logger.info(`[RT Debug] Status Code: ${response.statusCode}`);
		logger.info(`[RT Debug] Status Message: ${response.statusMessage || 'N/A'}`);

		if (response.headers && Object.keys(response.headers).length > 0) {
			logger.info('[RT Debug] Response Headers:');
			logger.info(JSON.stringify(response.headers, null, 2));
		}

		if (response.body) {
			logger.info('[RT Debug] Response Body:');
			// Truncate body if it's very large
			const bodyStr = typeof response.body === 'string'
				? response.body
				: JSON.stringify(response.body, null, 2);
			const maxBodyLength = 1000;
			if (bodyStr.length > maxBodyLength) {
				logger.info(bodyStr.substring(0, maxBodyLength) + `\n... [truncated ${bodyStr.length - maxBodyLength} chars]`);
			} else {
				logger.info(bodyStr);
			}
		}

		logger.info('[RT Debug] ========================');
	}

	return items;
}


/**
 * PreSend hook to merge CustomFields from multiple formats
 * Supports:
 * - resourceMapper (customFieldsUi) at top level
 * - JSON (customFields) in additionalFields/updateFields
 * Priority order: JSON (base) < resourceMapper (highest priority)
 */
export async function mergeCustomFieldsPreSend(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const operation = this.getNodeParameter('operation', 0) as string;
	const containerName = operation === 'update' ? 'updateFields' : 'additionalFields';

	// Get customFields (JSON format) from inside additionalFields or updateFields
	let customFieldsJson: Record<string, unknown> | undefined;
	try {
		const container = this.getNodeParameter(containerName, 0) as Record<string, unknown> | undefined;
		const rawJson = container?.customFields as string | undefined;
		if (typeof rawJson === 'string' && rawJson.trim().length > 0 && rawJson.trim() !== '{}') {
			customFieldsJson = JSON.parse(rawJson);
		}
	} catch {
		// customFields parameter may not exist or be empty
	}

	// Get customFieldsUi (resourceMapper format) at top level
	let resourceMapperValues: Record<string, unknown> | null = null;
	try {
		const customFieldsUi = this.getNodeParameter('customFieldsUi', 0) as {
			mappingMode?: string;
			value?: Record<string, unknown> | null;
		} | undefined;
		if (customFieldsUi?.value && typeof customFieldsUi.value === 'object') {
			resourceMapperValues = customFieldsUi.value;
		}
	} catch {
		// customFieldsUi parameter may not exist
	}

	// Merge formats with priority: JSON (base) < resourceMapper (highest)
	const merged = {
		...(customFieldsJson || {}),
		...(resourceMapperValues || {}),
	};

	// Only add CustomFields if there is something to add
	if (Object.keys(merged).length > 0) {
		requestOptions.body = { ...(requestOptions.body as Record<string, unknown>), CustomFields: merged };
	}

	return requestOptions;
}

/**
 * PreSend hook to properly build request body from parameters
 * Removes undefined/null values and prevents double-expression evaluation
 */
/**
 * Helper function to process attachments from n8n binary data or manual input
 */
async function processAttachmentsForUpload(
	context: IExecuteSingleFunctions,
	attachmentSource: string | undefined,
	binaryProperties: string | undefined,
	attachmentsJson: string | undefined,
): Promise<Array<{FileName: string, FileType: string, FileContent: string}> | undefined> {
	const debug = Boolean((context.getNode().parameters as IDataObject).nodeDebug);
	const logger: Logger | undefined = (context as unknown as { logger?: Logger }).logger;
	const log = (msg: string) => {
		if (debug && logger) logger.info(`[RT Debug] ${msg}`);
	};

	log(`processAttachmentsForUpload - attachmentSource: ${attachmentSource}`);
	log(`processAttachmentsForUpload - binaryProperties: ${binaryProperties}`);
	log(`processAttachmentsForUpload - attachmentsJson: ${attachmentsJson ? '[provided]' : 'undefined'}`);

	if (!attachmentSource || attachmentSource === 'none') {
		log('processAttachmentsForUpload - No attachmentSource or "none" selected, returning undefined');
		return undefined;
	}

	if (attachmentSource === 'manual' && attachmentsJson) {
		try {
			const parsed = typeof attachmentsJson === 'string' ? JSON.parse(attachmentsJson) : attachmentsJson;
			if (Array.isArray(parsed)) {
				log('processAttachmentsForUpload - using parsed manual attachments array');
				return parsed as Array<{FileName: string, FileType: string, FileContent: string}>;
			}
			return undefined;
		} catch (error) {
			log(`processAttachmentsForUpload - JSON parse error: ${(error as Error).message}`);
			throw new NodeOperationError(context.getNode(), 'Invalid JSON in Attachments field', { itemIndex: 0 });
		}
	}

	// Get binary data from input item
	const binaryData = context.getInputData().binary || {};
	const attachments: Array<{FileName: string, FileType: string, FileContent: string}> = [];

	if (attachmentSource === 'allBinaryData') {
		// Attach all binary properties
		for (const [key, binary] of Object.entries(binaryData)) {
			if (binary && (binary as IBinaryData).data) {
				const b = binary as IBinaryData;
				attachments.push({
					FileName: b.fileName || key,
					FileType: b.mimeType || 'application/octet-stream',
					FileContent: b.data, // Already base64 encoded in n8n
				});
			}
		}
	} else if (attachmentSource === 'binaryProperties') {
		// Attach selected binary properties (comma-separated string)
		const properties = typeof binaryProperties === 'string'
			? binaryProperties.split(',').map(p => p.trim()).filter(p => p)
			: (Array.isArray(binaryProperties) ? (binaryProperties as string[]) : []);

		for (const key of properties) {
			const binary = binaryData[key];
			if (binary && (binary as IBinaryData).data) {
				const b = binary as IBinaryData;
				attachments.push({
					FileName: b.fileName || key,
					FileType: b.mimeType || 'application/octet-stream',
					FileContent: b.data, // Already base64 encoded in n8n
				});
			}
		}
	}

	log(`processAttachmentsForUpload - prepared ${attachments.length} attachment(s)`);
	return attachments.length > 0 ? attachments : undefined;
}

/**
 * Helper to extract value from resourceLocator parameter
 * ResourceLocator can be { mode: 'list' | 'name' | 'id', value: string | number } or a plain string/number
 */
function extractResourceLocatorValue(param: unknown): string | number | undefined {
	if (param === undefined || param === null || param === '') {
		return undefined;
	}
	// If it's a resourceLocator object with mode and value
	if (typeof param === 'object' && param !== null && 'value' in param) {
		const value = (param as { value: unknown }).value;
		return value !== '' ? (value as string | number) : undefined;
	}
	// If it's a plain value (backwards compatibility)
	return param as string | number;
}

export async function buildRequestBodyPreSend(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const operation = this.getNodeParameter("operation", 0) as string;
	const body: Record<string, unknown> = {};

	// Helper to add field if defined
	const addField = (bodyKey: string, value: unknown) => {
		if (value !== undefined && value !== null && value !== '') {
			// For Update operation: Requestor, Cc, AdminCc MUST be arrays
			// For Create operation: they can be strings
			const emailFields = ['Requestor', 'Cc', 'AdminCc'];
			if (operation === 'update' && emailFields.includes(bodyKey)) {
				// Update requires arrays - convert strings to arrays by splitting on comma
				if (typeof value === 'string') {
					body[bodyKey] = value.split(',').map(v => v.trim());
				} else if (Array.isArray(value)) {
					body[bodyKey] = value;
				} else {
					body[bodyKey] = value;
				}
			} else {
				// For other operations/fields, unwrap single-element arrays but keep strings as strings
				if (Array.isArray(value) && value.length === 1) {
					body[bodyKey] = value[0];
				} else {
					body[bodyKey] = value;
				}
			}
		}
	};

	if (operation === 'create') {
		// Required fields
		const queueParam = this.getNodeParameter('queue', 0);
		body.Queue = extractResourceLocatorValue(queueParam);
		body.Subject = this.getNodeParameter('subject', 0) as string;

		// Optional fields
		const requestor = this.getNodeParameter('requestor', 0) as string | undefined;
		const content = this.getNodeParameter('content', 0) as string | undefined;
		addField('Requestor', requestor);
		addField('Content', content);

		// ContentType only if Content is provided
		if (content) {
			const contentType = this.getNodeParameter('contentType', 0) as string | undefined;
			body.ContentType = contentType || 'text/html';
		}

		// Additional fields
		const additionalFields = this.getNodeParameter('additionalFields', 0, {}) as Record<string, unknown>;
		addField('Priority', additionalFields.priority);
		addField('Status', additionalFields.status);
		addField('Owner', extractResourceLocatorValue(additionalFields.owner));
		addField('Cc', additionalFields.cc);
		addField('AdminCc', additionalFields.adminCc);
		addField('Due', additionalFields.due);
		addField('Starts', additionalFields.starts);
		addField('TimeEstimated', additionalFields.timeEstimated);
		addField('SLA', additionalFields.sla);

		// Attachments (top-level parameters)
		const attachmentSource = this.getNodeParameter('attachmentSource', 0) as string;
		const binaryProperties = attachmentSource === 'binaryProperties'
			? this.getNodeParameter('binaryProperties', 0) as string
			: undefined;
		const attachmentsJson = attachmentSource === 'manual'
			? this.getNodeParameter('attachmentsJson', 0) as string
			: undefined;
		const attachments = await processAttachmentsForUpload(
			this,
			attachmentSource,
			binaryProperties,
			attachmentsJson,
		);
		if (attachments) {
			body.Attachments = attachments;
		}
	} else if (operation === 'update') {
		// Update fields
		const updateFields = this.getNodeParameter('updateFields', 0, {}) as Record<string, unknown>;
		addField('Subject', updateFields.subject);
		addField('Queue', extractResourceLocatorValue(updateFields.queue));
		addField('Status', updateFields.status);
		addField('Priority', updateFields.priority);
		addField('Owner', extractResourceLocatorValue(updateFields.owner));
		addField('Requestor', updateFields.requestor);
		addField('Cc', updateFields.cc);
		addField('AdminCc', updateFields.adminCc);
		addField('Due', updateFields.due);
		addField('Starts', updateFields.starts);
		addField('TimeEstimated', updateFields.timeEstimated);
		addField('TimeWorked', updateFields.timeWorked);
		addField('TimeLeft', updateFields.timeLeft);
		addField('SLA', updateFields.sla);
	} else if (operation === 'addComment' || operation === 'addCorrespondence') {
		// Required content field
		body.Content = this.getNodeParameter('content', 0) as string;
		const options = this.getNodeParameter('options', 0, {}) as Record<string, unknown>;
		body.ContentType = (options.contentType as string) || 'text/html';

		// Additional fields
		const additionalFields = this.getNodeParameter('additionalFields', 0, {}) as Record<string, unknown>;
		addField('Subject', additionalFields.subject);
		addField('Status', additionalFields.status);
		addField('TimeTaken', additionalFields.timeTaken);

		// Attachments (top-level parameters)
		const attachmentSource = this.getNodeParameter('attachmentSource', 0) as string;
		const binaryProperties = attachmentSource === 'binaryProperties'
			? this.getNodeParameter('binaryProperties', 0) as string
			: undefined;
		const attachmentsJson = attachmentSource === 'manual'
			? this.getNodeParameter('attachmentsJson', 0) as string
			: undefined;
		const attachments = await processAttachmentsForUpload(
			this,
			attachmentSource,
			binaryProperties,
			attachmentsJson,
		);
		if (attachments) {
			body.Attachments = attachments;
		}
	}

	requestOptions.body = body;
	return requestOptions;
}
