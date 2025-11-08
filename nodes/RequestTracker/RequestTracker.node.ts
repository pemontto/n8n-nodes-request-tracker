import { NodeConnectionTypes, type INodeType, type INodeTypeDescription, type INodeProperties } from 'n8n-workflow';
import { ticketDescription } from './resources/ticket';
import { transactionDescription } from './resources/transaction';
import { attachmentDescription } from './resources/attachment';
import { userDescription } from './resources/user';
import { queueDescription } from './resources/queue';
import { debugPostReceiveResponse, debugPreSendRequest } from './GenericFunctions';

export class RequestTracker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Request Tracker',
		name: 'requestTracker',
		icon: { light: 'file:../../icons/requesttracker.svg', dark: 'file:../../icons/requesttracker.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Request Tracker REST2 API',
		defaults: {
			name: 'Request Tracker',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'requestTrackerApi',
				required: true,
			},
		],
		requestDefaults: {
			// Ensure no trailing slash on rtInstanceUrl, then append REST/2.0
			baseURL: '={{$credentials.rtInstanceUrl.replace(/\\/$/, "")}}/REST/2.0',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			skipSslCertificateValidation: '={{$credentials.allowUnauthorizedCerts}}',
		},
		properties: [
			{
				displayName: 'Debug',
				name: 'nodeDebug',
				type: 'boolean',
				isNodeSetting: true,
				default: false,
				noDataExpression: true,
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Attachment',
						value: 'attachment',
					},
					{
						name: 'Queue',
						value: 'queue',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
					{
						name: 'Transaction',
						value: 'transaction',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'ticket',
				routing: {
					request: {
						skipSslCertificateValidation: '={{ $credentials.allowUnauthorizedCerts }}',
					},
					send: {
						preSend: [debugPreSendRequest],
					},
					output: {
						postReceive: [debugPostReceiveResponse],
					}
				}
			},
			// Operations and fields for Resource: Attachment
			...attachmentDescription as INodeProperties[],
			// Operations and fields for Resource: Queue
			...queueDescription as INodeProperties[],
			// Operations and fields for Resource: Ticket
			...ticketDescription as INodeProperties[],
			// Operations and fields for Resource: Transaction
			...transactionDescription as INodeProperties[],
			// Operations and fields for Resource: User
			...userDescription as INodeProperties[],
		],
	};
}