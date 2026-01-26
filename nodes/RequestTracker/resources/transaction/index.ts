import type { INodeProperties } from 'n8n-workflow';
import { transactionGetDescription } from './get';
import { transactionGetManyDescription } from './getMany';
import { handleRtApiError, processTransactions, buildFieldsQueryParams } from '../../GenericFunctions';

const showOnlyForTransaction = {
	resource: ['transaction'],
};

export const transactionDescription: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'hidden',
		default: 'transaction',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForTransaction,
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a transaction',
				description: 'Get a single transaction by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/transaction/{{$parameter.transactionId}}',
					},
					send: {
						preSend: [buildFieldsQueryParams],
					},
					output: {
						postReceive: [handleRtApiError, processTransactions],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many transactions',
				description: 'Search for transactions using TransactionSQL queries',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'POST',
						url: '/transactions',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						qs: {
							per_page: '={{$parameter.returnAll ? 100 : Math.min($parameter.limit || 100, 100)}}',
							order: '={{$parameter.additionalOptions?.order || "DESC"}}',
							orderby: '={{$parameter.additionalOptions?.orderby || "Created"}}',
						},
						body: {
							query: '={{$parameter.query}}',
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
							processTransactions,
						],
					},
					send: {
						preSend: [buildFieldsQueryParams],
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
	...transactionGetDescription,
	...transactionGetManyDescription,
];
