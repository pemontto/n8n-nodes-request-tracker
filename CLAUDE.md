# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an n8n community node package for Request Tracker (RT5+) that integrates the RT REST2 API into n8n workflows. The node uses n8n's declarative routing system to interact with the Request Tracker REST2 API.

**Development Philosophy**
- **Prioritize clean design** - Make the best technical decisions without worrying about existing workflows
- **Breaking changes are acceptable** - Focus on getting it right, not maintaining compatibility

## Development Commands

- **Build**: `pnpm build` or `npm run build` - Uses n8n-node build to compile TypeScript and prepare dist/ for publishing
- **Build (watch mode)**: `pnpm run build:watch` - Runs TypeScript compiler in watch mode
- **Development**: `pnpm dev` or `npm run dev` - Run n8n in development mode with hot reload
- **Lint**: `pnpm lint` or `npm run lint` - Check code style using @n8n/node-cli eslint config
- **Lint (fix)**: `pnpm run lint:fix` - Auto-fix linting issues
- **Release**: `pnpm release` - Create a new release (uses release-it)
- **Prerelease check**: `pnpm run prepublishOnly` - Runs validation before npm publish

Package manager: **pnpm** (version 10.16.1+)

## Architecture

### n8n Node Structure

This package contains two nodes:

1. **Main Node** ([nodes/RequestTracker/RequestTracker.node.ts](nodes/RequestTracker/RequestTracker.node.ts)) - Regular action node with declarative routing
2. **Trigger Node** ([nodes/RequestTracker/RequestTrackerTrigger.node.ts](nodes/RequestTracker/RequestTrackerTrigger.node.ts)) - Polling trigger node with `poll()` method

#### Main Node (Regular Action Node)

This follows the standard n8n community node architecture with declarative routing:

1. **Main Node** ([nodes/RequestTracker/RequestTracker.node.ts](nodes/RequestTracker/RequestTracker.node.ts))
   - Implements `INodeType` interface
   - Defines `requestDefaults` with base URL construction: `{{$credentials.rtInstanceUrl}}/REST/2.0`
   - Sets headers: `Accept: application/json`, `Content-Type: application/json`
   - Aggregates resource descriptions (Ticket, Transaction, Attachment, User, Queue)
   - Supports `usableAsTool: true` for AI agent integration

2. **Credential Type** ([credentials/RequestTrackerApi.credentials.ts](credentials/RequestTrackerApi.credentials.ts))
   - Implements `ICredentialType` interface
   - Uses token-based authentication: `Authorization: token {{$credentials.apiToken}}`
   - Includes credential test endpoint: `GET /REST/2.0/rt`
   - Fields: `rtInstanceUrl`, `apiToken`, `allowUnauthorizedCerts` (optional, for self-signed certificates)
   - Shared by both main node and trigger node

3. **Resource Structure** (under `nodes/RequestTracker/resources/`)
   - Each resource has its own directory (e.g., `ticket/`)
   - `index.ts`: Exports resource description array with operations
   - Operation files (e.g., `get.ts`): Define operation-specific field descriptions
   - Uses declarative `routing` objects within operation definitions for HTTP requests

#### Trigger Node (Polling)

The trigger node ([nodes/RequestTracker/RequestTrackerTrigger.node.ts](nodes/RequestTracker/RequestTrackerTrigger.node.ts)) uses n8n's polling mechanism instead of declarative routing:

1. **Poll Method Pattern**:
   - Implements `async poll(this: IPollFunctions)` method
   - Uses `this.helpers.httpRequestWithAuthentication()` for API calls
   - Handles pagination manually in code
   - Returns `INodeExecutionData[][] | null`

2. **State Management**:
   - Tracks `lastTimeChecked` timestamp in workflow static data: `this.getWorkflowStaticData('node')`
   - Format: RT date format `YYYY-MM-DD HH:mm:ss` (UTC)
   - Updates after each successful poll with newest ticket's timestamp

3. **Query Construction**:
   - **Manual mode** (`this.getMode() === 'manual'`): Fetch recent tickets without time filter (max 10)
   - **Normal mode**: Append time filter to user's TicketSQL: `(${ticketSql}) AND ${triggerOnField} > '${lastTimeChecked}'`

4. **Parameters**:
   - `ticketSql`: Base TicketSQL query (user provides)
   - `triggerOnField`: Choose between 'LastUpdated' or 'Created' for time tracking
   - `options.outputFields`: Comma-separated field list (default: all standard fields via `getTicketFields()`)
   - `options.limit`: Max results per poll (default: 50, capped at 100)
   - `options.simplify`: Transform output using `transformSingleTicket()`

5. **Data Transformation**:
   - Uses exported `transformSingleTicket(ticket, simplify)` function from GenericFunctions
   - Same transformation logic as main node for consistency
   - Always expands Creator, Queue, and related user fields via `getExpandedFieldParams()`

6. **Pagination Logic**:
   - Manually loop through pages: `while (hasMore && allTickets.length < effectiveLimit)`
   - Calculate remaining items: `Math.min(effectiveLimit - allTickets.length, 100)`
   - RT caps `per_page` at 100, respect this limit
   - Stop when: returned count < per_page OR reached effective limit

### Declarative Routing Pattern (Main Node Only)

Operations define their HTTP routing inline using the `routing` property:

```typescript
{
  name: 'Get',
  value: 'get',
  routing: {
    request: {
      method: 'GET',
      url: '=/ticket/{{$parameter.ticketId}}',
    },
  },
}
```

This eliminates the need for manual `execute()` methods - n8n handles the HTTP request automatically.

### GenericFunctions ([nodes/RequestTracker/GenericFunctions.ts](nodes/RequestTracker/GenericFunctions.ts))

Contains shared transformation and utility functions used across operations:

1. **Data Transformation Functions**:
   - `transformTicketData`: Converts RT API ticket format to n8n-friendly format
     - Transforms `CustomFields` array → dictionary (keyed by field name)
     - Transforms `_hyperlinks` array → structured `Links` object
     - Unwraps single-value arrays to scalars, converts empty arrays to null
     - Optionally flattens CustomFields to top-level and simplifies user/queue objects
     - Sorts keys with preferred order (id, Queue, Subject, Status, etc.)
   - `transformOperationResponse`: Transforms responses from Create/Update/Comment/Correspond operations
     - Extracts result message and metadata from operation responses
   - `processTransactions` (alias: `processTicketComments`, `processTicketHistory`): Processes transactions/history items
     - **Always includes `id` field in output, even when `simplify=true`**
     - Extracts attachment links from `_hyperlinks`
     - Optionally fetches attachment content for text/plain and text/html attachments
     - Returns transaction with embedded `Attachments` array
   - `processAttachment`: Processes single attachment response (for Attachment > Get)
     - Decodes base64 Content field to binary data
     - Adds TextContent field for text-based attachments
     - Formats as n8n binary data with proper mimeType and fileName
   - `processAttachments`: Processes multiple attachments (for Attachment > Get Many)
     - Handles optional content download based on `additionalOptions.downloadContent`
     - Returns metadata only when content download disabled (faster for large result sets)
     - Decodes and formats content as n8n binary data when enabled
   - `buildRequestBodyPreSend`: Constructs request body from n8n parameters for Create/Update/Comment operations
     - Handles conditional field inclusion based on parameter presence
   - `mergeCustomFieldsPreSend`: Merges separate custom field parameters into RT's CustomFields format
     - Converts individual custom field inputs into RT API array structure

2. **API Helpers**:
   - `getTicketFields()`: Returns comma-separated list of standard ticket fields
   - `getDefaultFields(resource)`: Returns default fields for a given resource type (ticket, transaction, attachment, user, queue)
   - `getExpandedFieldParams(resource?)`: Returns query parameters for expanding linked objects (users, queues, etc.). Resource-specific when provided.
   - `buildFieldsQueryParams`: PreSend hook that dynamically sets `fields` and `fields[*]` query params based on optional `outputFields` parameter
     - If `outputFields` is non-empty, uses only those fields (no automatic expansion of linked objects)
     - If `outputFields` is empty string, don't send `fields` param at all - RT returns minimum fields (id, type, _url)
     - If `outputFields` parameter doesn't exist for the operation, uses default fields with automatic expansion of linked objects
     - Handles special cases like Attachment operations (Content field) and Ticket > Get History (returns transaction fields)
     - **Note**: When `outputFields` is specified (non-empty), linked objects (Creator, Queue, Owner, etc.) return only IDs, not expanded data.
   - `handleRtApiError`: Error handler for RT API responses (handles 200 OK with error body)

3. **Debug Functions**:
   - `debugPreSendRequest`: Logs HTTP request details when `nodeDebug` setting enabled
   - `debugPostReceiveResponse`: Logs HTTP response details when `nodeDebug` setting enabled

**Usage Pattern**: Functions designed for declarative routing hooks (`postReceive`, `preSend`) receive `INodeExecutionData[]` and return transformed `INodeExecutionData[]`.

### Advanced Declarative Routing Features

The codebase uses several advanced n8n routing features beyond basic HTTP requests:

1. **Pagination** (see detailed section below)

2. **postReceive Hooks** (see `ticket/index.ts` operations):
   - Chain multiple postReceive functions: `[handleRtApiError, transformTicketData]`
   - `type: 'rootProperty'` to extract nested response data (e.g., `items` array)
   - Custom transformation functions from GenericFunctions.ts

3. **Query String Dynamic Parameters**:
   - Expressions like `'={{ $parameter.limit || 100 }}'` for conditional values
   - Spread operator for shared parameters: `...getExpandedFieldParams()`

4. **Form-Encoded POST Bodies for SQL Queries**:
   - **IMPORTANT**: When using TicketSQL or TransactionSQL queries, the request MUST use `Content-Type: application/x-www-form-urlencoded`
   - Examples:
     - `POST /tickets` with TicketSQL query (see `ticket/index.ts` Search operation)
     - `POST /transactions` with TransactionSQL query (see `transaction/index.ts` Get Many operation)
   - Body contains the `query` parameter with SQL string
   - Pagination and ordering parameters go in URL query string (qs)
   - **Pattern**:
     ```typescript
     routing: {
       request: {
         method: 'POST',
         url: '/tickets',  // or '/transactions'
         headers: {
           'Content-Type': 'application/x-www-form-urlencoded',
         },
         qs: {
           per_page: '={{$parameter.returnAll ? 100 : Math.min($parameter.limit || 100, 100)}}',
           order: '={{$parameter.additionalOptions?.order || "DESC"}}',
           orderby: '={{$parameter.additionalOptions?.orderby || "Created"}}',
           // ... field selection params
         },
         body: {
           query: '={{$parameter.query}}',  // TicketSQL or TransactionSQL
         },
       },
     }
     ```

### Pagination Implementation Pattern

This node implements n8n's declarative pagination for operations that return multiple items (Search, Get Comments, Transaction > Get Many). Here's the complete pattern:

#### RT API Pagination Behavior

RT REST2 API uses page-based pagination with the following response structure:
```json
{
  "items": [...],
  "page": 1,
  "per_page": 100,
  "total": 543,
  "next_page": "https://rt.example.com/REST/2.0/tickets?page=2&..."
}
```

#### n8n Declarative Pagination Configuration

**Basic Structure** (in operation's `routing` object):
```typescript
routing: {
  request: {
    method: 'POST',
    url: '/tickets',
    qs: {
      per_page: '={{ Math.min($parameter.limit || 100, 100) }}',  // Cap at 100
      // ... other params
    },
  },
  output: {
    postReceive: [
      { type: 'rootProperty', properties: { property: 'items' } },  // Extract items array
      handleRtApiError,
      transformTicketData,
    ],
  },
  send: {
    paginate: true,  // Enable pagination
  },
  operations: {
    pagination: {
      type: 'generic',
      properties: {
        // Continue condition - when to fetch next page
        continue: '={{ $response.body.page * $response.body.per_page < ($parameter.limit || $response.body.total) }}',
        request: {
          // Next page request configuration
          qs: {
            per_page: '={{ $parameter.limit ? Math.min($parameter.limit - ($response.body.page * $response.body.per_page), 100) : 100 }}',
            page: '={{ $response.body.page + 1 }}',
            // ... repeat other params from initial request
          },
          body: '={{ ... }}',  // Repeat body from initial request
        },
      },
    },
  },
}
```

#### Key Pagination Concepts

1. **`returnAll` Parameter Pattern**:
   - Add `returnAll: boolean` and `limit: number` parameters to operation
   - Initial request uses: `per_page: '={{ $parameter.returnAll ? 100 : $parameter.limit }}'`
   - Continue condition checks user's limit: `$parameter.limit || $response.body.total`

2. **RT 100-Item Page Limit**:
   - RT REST2 caps `per_page` at 100
   - Always use `Math.min($parameter.limit, 100)` to respect RT's limit
   - Calculate remaining items for subsequent pages: `Math.min($parameter.limit - ($response.body.page * $response.body.per_page), 100)`

3. **Continue Expression Logic**:
   - Check if more items needed: `$response.body.page * $response.body.per_page < $parameter.limit`
   - If `returnAll: true`, check total: `$response.body.page * $response.body.per_page < $response.body.total`
   - Combined: `'={{ ... < ($parameter.limit || $response.body.total) }}'`

4. **`next_page` URL Alternative**:
   - RT provides `next_page` URL in response
   - Can use instead of manual page increment: `url: '={{ $response.body.next_page }}'`
   - Still need to override `per_page` in `qs` to respect user's remaining limit
   - Example in Get Comments operation (see `ticket/index.ts:160-170`)

5. **Duplicate All Query Parameters**:
   - **CRITICAL**: All `qs` and `body` params from initial request must be repeated in `pagination.request`
   - n8n doesn't automatically carry over parameters between pagination requests
   - Includes sorting (`order`, `orderby`), filtering, and field selection params

#### Example: Two Pagination Styles

**Style 1: Manual Page Increment** (Ticket Search):
```typescript
continue: '={{ $response.body.page * $response.body.per_page < ($parameter.limit || $response.body.total) }}',
request: {
  qs: {
    page: '={{ $response.body.page + 1 }}',
    per_page: '={{ $parameter.limit ? Math.min(...) : 100 }}',
    // ... all other params from initial request
  },
  body: { query: '={{ $parameter.query }}' },  // Repeat from initial
}
```

**Style 2: Using `next_page` URL** (Get Comments):
```typescript
continue: '={{ !!$response.body.next_page && (!$parameter.limit || $response.body.page * $response.body.per_page < $parameter.limit) }}',
request: {
  url: '={{ $response.body.next_page }}',
  qs: {
    per_page: '={{ $parameter.limit ? Math.min(...) : 100 }}',  // Override per_page only
    // Other params come from next_page URL, but safe to repeat for clarity
  },
}
```

#### Common Pitfalls

1. **Forgetting to repeat parameters**: Pagination requests need ALL initial params
2. **Not capping at 100**: RT rejects `per_page > 100`
3. **Wrong continue logic**: Must check both user limit AND available data
4. **Missing rootProperty**: Extract `items` array before transformation hooks

### Adding New Operations/Resources

1. Create operation description file in `resources/<resource>/<operation>.ts`
   - Export `INodeProperties[]` with field definitions and `displayOptions`
   - For multi-item operations, include `returnAll` (boolean) and `limit` (number) parameters

2. Add operation to resource's `index.ts` with inline routing configuration
   - Define HTTP routing with `method`, `url`, `qs`, `body`
   - Add postReceive hooks for error handling and data transformation
   - **For multi-item operations**: Implement pagination following the pattern in "Pagination Implementation Pattern" section
     - Add `send.paginate: true`
     - Configure `operations.pagination` with `continue` expression and request params
     - Remember to repeat ALL query/body params in pagination request
     - Use `rootProperty` to extract `items` array from RT response

3. If new resource, import and spread description in main node properties

4. If transformation needed, add function to GenericFunctions.ts

### Code Style

- **Indentation**: Tabs (width 2)
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Trailing commas**: All
- **Line width**: 100 characters
- **TypeScript**: Strict mode enabled with comprehensive strictness flags

## Current Implementation Status

**Implemented**:
- **Ticket** resource:
  - Get: Retrieve a single ticket by ID
  - Create: Create a new ticket with metadata and custom fields
  - Update: Update ticket metadata and custom fields
  - Add Comment: Add internal comment to a ticket
  - Add Correspondence: Add external correspondence (reply) to a ticket
  - Search: Search tickets using TicketSQL, simple search, or saved searches (with pagination)
  - Get History: Get ticket history/transactions with filtering and attachment options

- **Transaction** resource:
  - Get: Retrieve a single transaction by ID (no ticket ID required, includes Ticket/ObjectType/ObjectId fields for relationship)
  - Get Many: Search transactions globally using TransactionSQL queries with pagination

- **Attachment** resource:
  - Get: Retrieve a single attachment by ID with optional content download
  - Get Many: Get attachments scoped to either a transaction or ticket, with filtering by filename/content type/dates and optional content download

- **User** resource:
  - Get: Retrieve a single user by ID or username
  - Get Many: Get list of users with filtering by username/email (with pagination)

- **Queue** resource:
  - Get: Retrieve a single queue by ID or name
  - Get Many: Get list of queues with filtering by name/description/lifecycle (with pagination)

## RT REST2 API Details

- Base path: `/REST/2.0`
- Authentication: `Authorization: token <API_TOKEN>` header
- Content-Type: `application/json` (default), `application/x-www-form-urlencoded` (for search queries)
- API Documentation: https://docs.bestpractical.com/rt/5.0.9/RT/REST2.html
- Field expansion: Use `fields[FieldName]` query parameters to expand linked objects (users, queues)
- Pagination: RT returns `page`, `per_page`, `total`, `next_page` in response body

### RT API Quirks and Inconsistencies

**IMPORTANT**: The RT REST2 API handles the `Content` field differently between attachment endpoints:

1. **`/attachment/{id}` (singular)** - Returns `Content` field with **additional base64 encoding**
   - RT applies an extra base64 encoding layer via `around 'serialize'` wrapper
   - Content must be decoded: `Buffer.from(content, 'base64')`
   - Example: `GET /REST/2.0/attachment/12345?fields=Content`
   - **This node does NOT use this endpoint** - we use the plural endpoint instead

2. **`/attachments` (plural)** - Returns `Content` field **already decoded by RT**
   - RT's `Content` method handles database decoding transparently via `_DecodeLOB`
   - No additional base64 layer applied - content is ready to use
   - Example: `POST /REST/2.0/transaction/67890/attachments?fields=Content`
   - Example: `POST /REST/2.0/ticket/12345/attachments?fields=Content`
   - **This node uses this endpoint exclusively for all attachment operations**

**Technical Details**:
- Database storage encoding (base64 vs binary BLOB) depends on `$RT::Handle->BinarySafeBLOBs` configuration
- RT's `Content` method automatically decodes based on `ContentEncoding` field
- Singular endpoint adds extra base64 encoding, plural endpoints don't

**Code Implementation in This Node**:
- **All operations** (including "Attachment > Get") use `POST /attachments` with filters
- `processSingleAttachmentContent()` - Handles `/attachments` responses (content already decoded by RT)
- `fetchAttachments()` - Base function for fetching attachments with configurable options
- See [GenericFunctions.ts](nodes/RequestTracker/GenericFunctions.ts) for implementation details

**Performance Optimization**: The `processTransactions` function (used for ticket history) implements smart bulk fetching:
- When `includeContent` OR `includeAttachments` is true, fetches all attachments with content in a single bulk request
- Avoids N individual API calls for content extraction
- See line 1000 in GenericFunctions.ts for the optimization logic

## Build Output

- Source: `credentials/`, `nodes/`
- Output: `dist/` (committed to repo for npm publishing)
- TypeScript config includes declaration files and source maps
- Only `dist/` is included in published package (see `files` in package.json)

## Debugging

The node includes a Debug mode accessible via node settings:
- Enable via `nodeDebug` boolean parameter in node settings UI
- Logs all HTTP requests (method, URL, query params, headers, body)
- Logs all HTTP responses (status, headers, body - truncated if >5000 chars)
- Authorization headers are redacted in logs
- Implemented via `debugPreSendRequest` and `debugPostReceiveResponse` hooks in GenericFunctions.ts
