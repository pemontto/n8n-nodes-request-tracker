import type { INodeProperties } from 'n8n-workflow';
import { attachmentGetDescription } from './get';
import { attachmentGetManyDescription } from './getMany';
import { debugPreSendRequest, handleRtApiError, processAttachments } from '../../GenericFunctions';

const showOnlyForAttachment = {
	resource: ['attachment'],
};

export const attachmentDescription: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'hidden',
		default: 'attachment',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForAttachment,
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get an attachment',
				description: 'Get an attachment by ID',
				routing: {
					request: {
						method: 'POST',
						url: '/attachments',
						body: '={{ [{ field: "id", operator: "=", value: $parameter.attachmentId }] }}',
						qs: {
							fields: 'Subject,Filename,ContentType,ContentLength,Created,Creator,TransactionId,MessageId,Content,Headers',
							'fields[Creator]': 'id,Name,RealName,EmailAddress',
							per_page: '1',
						},
					},
					output: {
						postReceive: [
							{ type: 'rootProperty', properties: { property: 'items' } },
							handleRtApiError,
							processAttachments,
						],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many attachments',
				description: 'Get attachments for a transaction or ticket with filtering',
				routing: {
					request: {
						// ignoreHttpStatusErrors: true,
						method: 'POST',
						url: '={{ $parameter.scope === "transaction" ? "/transaction/" + $parameter.transactionId + "/attachments" : "/ticket/" + $parameter.ticketId + "/attachments" }}',
						body: '={{ [...($parameter.filterOptions?.filename ? [{ field: "Filename", operator: "LIKE", value: $parameter.filterOptions.filename }] : []), ...($parameter.filterOptions?.filenameExists ? [{ field: "Filename", operator: "!=", value: "", entry_aggregator: "AND" }] : []), ...($parameter.filterOptions?.contentType ? [{ field: "ContentType", operator: "LIKE", value: $parameter.filterOptions.contentType }] : []), ...($parameter.filterOptions?.createdAfter ? [{ field: "Created", operator: ">", value: $parameter.filterOptions.createdAfter, entry_aggregator: "AND" }] : []), ...($parameter.filterOptions?.createdBefore ? [{ field: "Created", operator: "<", value: $parameter.filterOptions.createdBefore, entry_aggregator: "AND" }] : [])] }}',
						qs: {
							fields: '={{ "Subject,Filename,ContentType,ContentLength,Created,Creator,TransactionId,MessageId,Headers" + ($parameter.additionalOptions?.downloadContent ? ",Content" : "") }}',
							'fields[Creator]': 'id,Name,RealName,EmailAddress',
							per_page: '={{$parameter.returnAll ? 100 : Math.min($parameter.limit || 100, 100)}}',
							order: '={{$parameter.additionalOptions?.order || "DESC"}}',
							orderby: '={{$parameter.additionalOptions?.orderby || "Created"}}',
						},
					},
					output: {
						maxResults: '={{ $parameter.limit }}',
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'items',
								},
							},
							handleRtApiError,
							processAttachments,
						],
					},
					send: {
						paginate: '={{ $parameter.returnAll || $parameter.limit > 100 }}',
						preSend: [debugPreSendRequest]
					},
					operations: {
						pagination: {
							type: 'generic',
							properties: {
								continue: '={{ !!$response.body.next_page && $response.body.items.length && ($parameter.returnAll || $response.body.page * $response.body.per_page < $parameter.limit) }}',
								request: {
									url: '={{ $request.url }}?page={{ ($response.body?.page || 0) + 1 }}',
								},
							},
						},
					},
				},
			},
		],
		default: 'get',
	},
	...attachmentGetDescription,
	...attachmentGetManyDescription,
];
