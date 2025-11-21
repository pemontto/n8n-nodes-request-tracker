import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	transformSingleTicket,
	getTicketFields,
	getExpandedFieldParams,
} from './GenericFunctions';

export class RequestTrackerTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Request Tracker Trigger',
		name: 'requestTrackerTrigger',
		icon: { light: 'file:../../icons/request-tracker.svg', dark: 'file:../../icons/request-tracker.dark.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when new or updated tickets are found in Request Tracker',
		defaults: {
			name: 'Request Tracker Trigger',
		},
		credentials: [
			{
				name: 'requestTrackerApi',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Debug',
				name: 'nodeDebug',
				type: 'boolean',
				isNodeSetting: true,
				default: false,
				noDataExpression: true,
				description: 'Whether to enable detailed debug logging for troubleshooting trigger behavior',
			},
			{
				displayName: 'TicketSQL Query',
				name: 'ticketSql',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				required: true,
				default: '',
				description: 'The TicketSQL query to find relevant tickets (e.g., "Queue = \'General\' AND Status = \'open\'"). The time-based filter will be appended automatically.',
			},
			{
				displayName: 'Trigger On',
				name: 'triggerOnField',
				type: 'options',
				required: true,
				default: 'LastUpdated',
				options: [
					{ name: 'Last Updated Time', value: 'LastUpdated' },
					{ name: 'Created Time', value: 'Created' },
				],
				description: 'The date field to use for detecting new/updated tickets',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				description: 'Additional optional settings',
				options: [
					{
						displayName: 'Output Fields',
						name: 'outputFields',
						type: 'string',
						default: '',
						placeholder: 'Leave empty for all standard fields',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
						description: 'Comma-separated list of fields to retrieve from RT (e.g., "id,Subject,Status"). Leave empty to use all standard fields.',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 50,
						typeOptions: {
							minValue: 1,
							maxValue: 100,
						},
						description: 'Max number of results to return',
					},
					{
						displayName: 'Simplify Output',
						name: 'simplify',
						type: 'boolean',
						default: false,
						description: 'Whether to simplify the output (flatten nested fields, remove metadata, etc.)',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const isManualMode = this.getMode() === 'manual';
		const logger = this.logger;

		// Get parameters
		const nodeDebug = this.getNodeParameter('nodeDebug', 0) as boolean;
		const ticketSql = this.getNodeParameter('ticketSql', 0) as string;
		const triggerOnField = this.getNodeParameter('triggerOnField', 0) as string;
		const options = this.getNodeParameter('options', 0, {}) as IDataObject;
		const outputFields = (options.outputFields as string) || getTicketFields();
		const limit = (options.limit as number) || 50;
		const simplify = (options.simplify as boolean) || false;

		// Format date for RT API (YYYY-MM-DD HH:mm:ss)
		const rtDateFormat = (date: Date): string => {
			return date.toISOString().slice(0, 19).replace('T', ' ');
		};

		// Use field-specific state key to support multiple triggers with different fields
		// This allows one workflow to have both a "Created" trigger and a "LastUpdated" trigger
		// without them interfering with each other's timestamps
		const stateKey = `lastTimeChecked_${triggerOnField}`;
		const now = new Date();

		// Initialize field-specific lastTimeChecked on first run
		const isFirstRun = !webhookData[stateKey];
		if (isFirstRun) {
			webhookData[stateKey] = rtDateFormat(now);
			if (nodeDebug) {
				logger.info(`[RT Trigger] First run - initialized ${stateKey} = ${webhookData[stateKey]}`);
			}
		}

		// Store the previous value for logging
		const previousLastChecked = webhookData[stateKey] as string;

		// Debug: Log all static data to detect crossover between triggers
		if (nodeDebug) {
			logger.info(`[RT Trigger] Current static data: ${JSON.stringify(webhookData, null, 2)}`);
		}

		// Build query based on mode
		let query: string;
		let orderDirection: string;
		let effectiveLimit: number;

		if (isManualMode) {
			// Manual mode: fetch recent tickets without time filter
			query = ticketSql;
			orderDirection = 'DESC';
			effectiveLimit = Math.min(limit, 10);
			if (nodeDebug) {
				logger.info(`[RT Trigger] Manual mode: fetching up to ${effectiveLimit} recent tickets (no time filter)`);
			}
		} else {
			// Normal polling mode: append time filter using field-specific timestamp
			let lastChecked = webhookData[stateKey] as string;

			// Normalize timestamp format for RT query (remove T and Z if present)
			if (lastChecked.includes('T')) {
				lastChecked = lastChecked.slice(0, 19).replace('T', ' ');
			}
			lastChecked = lastChecked.replace('Z', '').trim();

			query = `(${ticketSql}) AND ${triggerOnField} > '${lastChecked}'`;
			orderDirection = 'ASC';
			effectiveLimit = limit;
			if (nodeDebug) {
				logger.info(`[RT Trigger] Polling for tickets where ${triggerOnField} > '${lastChecked}' (limit: ${effectiveLimit})`);
			}
		}

		// Get credentials
		const credentials = await this.getCredentials('requestTrackerApi');
		const baseUrl = (credentials.rtInstanceUrl as string).replace(/\/$/, '');
		const allowUnauthorizedCerts = credentials.allowUnauthorizedCerts as boolean;

		// Fetch tickets with pagination
		const allTickets: IDataObject[] = [];
		let page = 1;
		let hasMore = true;

		try {
			while (hasMore && allTickets.length < effectiveLimit) {
				const perPage = Math.min(effectiveLimit - allTickets.length, 100);

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'requestTrackerApi',
					{
						method: 'POST',
						url: `${baseUrl}/REST/2.0/tickets`,
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						qs: {
							fields: outputFields,
							...getExpandedFieldParams(),
							orderby: triggerOnField,
							order: orderDirection,
							per_page: perPage,
							page: page,
						},
						body: { query },
						json: true,
						skipSslCertificateValidation: allowUnauthorizedCerts,
					},
				)) as IDataObject;

				const items = (response.items as IDataObject[]) || [];
				allTickets.push(...items);

				// Check for more pages
				const returnedCount = items.length;
				hasMore = returnedCount === perPage && allTickets.length < effectiveLimit;
				page++;
			}
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}
			throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: 0 });
		}

		// Log results with ticket IDs and timestamps
		if (nodeDebug) {
			logger.info(`[RT Trigger] Found ${allTickets.length} ticket(s) matching query`);
			if (allTickets.length > 0) {
				const ticketIds = allTickets.map(t => t.id).join(', ');
				logger.info(`[RT Trigger] Ticket IDs: ${ticketIds}`);
			}
		}

		// Return null if no tickets found
		if (allTickets.length === 0) {
			return null;
		}

		// Update field-specific lastTimeChecked in normal mode
		if (!isManualMode && allTickets.length > 0) {
			const latestTicket = allTickets[allTickets.length - 1]; // ASC order, last is newest
			let newTimestamp = latestTicket[triggerOnField] as string;
			if (newTimestamp) {
				// Normalize RT timestamp format - RT may return ISO format (YYYY-MM-DDTHH:mm:ssZ)
				// but expects queries in RT format (YYYY-MM-DD HH:mm:ss)
				if (newTimestamp.includes('T')) {
					newTimestamp = newTimestamp.slice(0, 19).replace('T', ' ');
				}
				// Remove trailing Z if present
				newTimestamp = newTimestamp.replace('Z', '').trim();

				if (nodeDebug) {
					logger.info(`[RT Trigger] Updating ${stateKey}: '${previousLastChecked}' → '${newTimestamp}'`);
				}
				webhookData[stateKey] = newTimestamp;
				if (nodeDebug) {
					logger.info(`[RT Trigger] Static data after update: ${JSON.stringify(webhookData, null, 2)}`);
				}
			} else {
				if (nodeDebug) {
					logger.warn(`[RT Trigger] Latest ticket missing ${triggerOnField} field, keeping timestamp: '${previousLastChecked}'`);
				}
			}
		} else if (isManualMode && nodeDebug) {
			logger.info(`[RT Trigger] Manual mode - not updating ${stateKey} (remains: '${previousLastChecked}')`);
		}

		// Transform tickets using the shared function
		const processedTickets = allTickets.map((ticket) =>
			transformSingleTicket(ticket, simplify),
		);

		if (nodeDebug) {
			logger.info(`[RT Trigger] Returning ${processedTickets.length} processed ticket(s) to workflow`);
		}
		return [this.helpers.returnJsonArray(processedTickets)];
	}
}
