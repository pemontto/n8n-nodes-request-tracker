import type { INodeProperties } from 'n8n-workflow';
import { userGetDescription } from './get';
import { userGetManyDescription } from './getMany';
import { handleRtApiError, transformUserData } from '../../GenericFunctions';

const showOnlyForUser = {
	resource: ['user'],
};

export const userDescription: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'hidden',
		default: 'user',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForUser,
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a user',
				description: 'Get a single user by ID or username',
				routing: {
					request: {
						method: 'GET',
						url: '=/user/{{$parameter.userId}}',
						qs: {
							fields: 'id,Name,CustomFields,EmailAddress,RealName,NickName,Organization,HomePhone,WorkPhone,MobilePhone,PagerPhone,Address1,Address2,City,State,Zip,Country,Gecos,Lang,Timezone,Comments,Signature,Creator,Created,LastUpdatedBy,LastUpdated,Disabled,Privileged',
							'fields[Creator]': 'id,Name,RealName,EmailAddress',
							'fields[LastUpdatedBy]': 'id,Name,RealName,EmailAddress',
						},
					},
					output: {
						postReceive: [handleRtApiError, transformUserData],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many users',
				description: 'Get a list of users',
				routing: {
					request: {
						method: 'GET',
						url: '={{ $parameter.additionalOptions?.includeAllUsers ? "/users" : "/users/privileged" }}',
						qs: {
							query: '={{ JSON.stringify([...($parameter.filters?.username ? [{ field: "Name", operator: "LIKE", value: $parameter.filters.username }] : []), ...($parameter.filters?.email ? [{ field: "EmailAddress", operator: "LIKE", value: $parameter.filters.email, entry_aggregator: "AND" }] : [])]) }}',
							fields: 'id,Name,CustomFields,EmailAddress,RealName,NickName,Organization,HomePhone,WorkPhone,MobilePhone,PagerPhone,Address1,Address2,City,State,Zip,Country,Gecos,Lang,Timezone,Comments,Signature,Creator,Created,LastUpdatedBy,LastUpdated',
							'fields[Creator]': 'id,Name,RealName,EmailAddress',
							'fields[LastUpdatedBy]': 'id,Name,RealName,EmailAddress',
							per_page: '={{$parameter.returnAll ? 100 : Math.min($parameter.limit || 100, 100)}}',
							order: '={{$parameter.additionalOptions?.order || "ASC"}}',
							orderby: '={{$parameter.additionalOptions?.orderby || "Name"}}',
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
							transformUserData,
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
	...userGetDescription,
	...userGetManyDescription,
];
