import type { INodeProperties } from 'n8n-workflow';
import { queueGetDescription } from './get';
import { queueGetManyDescription } from './getMany';
import { handleRtApiError } from '../../GenericFunctions';

const showOnlyForQueue = {
	resource: ['queue'],
};

export const queueDescription: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'hidden',
		default: 'queue',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForQueue,
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a queue',
				description: 'Get a single queue by ID or name',
				routing: {
					request: {
						method: 'GET',
						url: '=/queue/{{$parameter.queueId}}',
						qs: {
							fields: 'id,Name,Description,Lifecycle,SubjectTag,CorrespondAddress,CommentAddress,Disabled',
						},
					},
					output: {
						postReceive: [handleRtApiError],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many queues',
				description: 'Get a list of queues',
				routing: {
					request: {
						method: 'POST',
						url: '/queues',
						headers: {
							'Content-Type': 'application/json',
						},
						qs: {
							fields: 'id,Name,Description,CorrespondAddress,CommentAddress,SubjectTag,Lifecycle,SortOrder,Creator,Created,LastUpdatedBy,LastUpdated,SLADisabled,Disabled',
							per_page: '={{$parameter.returnAll ? 100 : Math.min($parameter.limit || 100, 100)}}',
							order: '={{$parameter.additionalOptions?.order || "ASC"}}',
							orderby: '={{$parameter.additionalOptions?.orderby || "Name"}}',
						},
						body: '={{ ($parameter.filters?.queueName || $parameter.filters?.description || $parameter.filters?.lifecycle) ? [...($parameter.filters?.queueName ? [{ field: "Name", operator: "LIKE", value: $parameter.filters.queueName }] : []), ...($parameter.filters?.description ? [{ field: "Description", operator: "LIKE", value: $parameter.filters.description, entry_aggregator: "AND" }] : []), ...($parameter.filters?.lifecycle ? [{ field: "Lifecycle", operator: "=", value: $parameter.filters.lifecycle, entry_aggregator: "AND" }] : [])] : [{ field: "id", operator: ">", value: "0" }] }}'
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
						],
					},
					send: {
						paginate: '={{ $parameter.returnAll || $parameter.limit > 100 }}',
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
	...queueGetDescription,
	...queueGetManyDescription,
];
