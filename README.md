<img src="https://raw.githubusercontent.com/pemontto/n8n-nodes-request-tracker/main/icons/request-tracker.svg" width="120" alt="Request Tracker Logo" />

# n8n-nodes-request-tracker

Community node for Request Tracker (RT 5+) providing comprehensive access to the REST2 API in n8n workflows.

[n8n](https://n8n.io/) is a fair-code licensed workflow automation platform.

[Installation](#installation)
[Implemented Nodes & Operations](#implemented-nodes--operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Notes](#notes)
[Resources](#resources)

## Installation

Follow the official guide for installing community nodes: https://docs.n8n.io/integrations/community-nodes/installation/

## Implemented Nodes & Operations

This package exposes two nodes:

- Request Tracker (main)
- Request Tracker Trigger

Implemented resources and operations in the main node:

- Ticket
  - Create: create a new ticket (supports content, status, owner, priority, recipients, attachments)
  - Get: fetch a single ticket by ID
  - Update: update ticket metadata (subject, queue, status, priority, owner, recipients, due/start/time fields, SLA)
  - Add Comment: add an internal comment to a ticket (supports attachments)
  - Add Correspondence: add external correspondence/reply (supports attachments)
  - Search: search tickets (TicketSQL or simple query; pagination and field expansion supported)
  - Get History: fetch transactions for a ticket with filters and optional content/attachments aggregation

- Attachment
  - Get: fetch a single attachment by ID (returns text content inline and binary via n8n binary data)
  - Get Many: list/download attachments for a transaction or ticket with filters (filename, content type, created range), optional content download, and pagination

- Transaction
  - Get: fetch a single transaction by ID
  - Get Many: search transactions via TransactionSQL (pagination, field selection)

- User
  - Get: fetch a single user by ID or username
  - Get Many: list users (privileged or all) with filters (username, email) and pagination

- Queue
  - Get: fetch a single queue by ID or name
  - Get Many: list queues with filters (name, description, lifecycle) and pagination

Additional features:
- Field expansion for linked objects (Queue, Creator, Owner, Requestors, Cc, AdminCc)
- Output simplification option to flatten custom fields and user references
- Robust post-receive transformations for tickets, queues, users, transactions, and attachments
- UI list-search helpers for queues and users (typeahead search in dropdowns)
- Resource Mapper for CustomFields with queue-aware loading (see Notes)

Request Tracker Trigger node:
- Polls for newly created or updated tickets using a TicketSQL base query with time-based filtering
- Configurable trigger field (Created or LastUpdated), limit, field selection, and output simplification
- Supports manual mode to fetch recent items without time filter

## Credentials

Authentication: API Token for RT REST2.

- Fields:
  - RT Instance URL (e.g. https://rt.mycompany.com or https://rt.mycompany.com/rt)
  - API Token
  - Ignore TLS Issues (Insecure): allow requests to instances with self-signed/expired certificates

Authorization header:
- Authorization: token <API_TOKEN>

Connectivity test:
- Performs a request to `/REST/2.0/rt` using your instance URL to verify reachability and TLS settings.

## Compatibility

Tested with n8n 1.60.0+.

## Usage

1. Create credentials:
   - Request Tracker API
   - RT Instance URL (no trailing slash required; the node resolves `/REST/2.0`)
   - API Token
   - Optionally enable Ignore TLS Issues for self-signed certs

2. Add the "Request Tracker" node or "Request Tracker Trigger" node to a workflow.

3. Select a Resource and Operation:
   - Examples:
     - Ticket → Get → enter ticketId
     - Ticket → Create → set Queue, Subject, optional Content/Status/Owner/recipients; add attachments via:
       - all binary data from the incoming item
       - selected binary properties
       - manual JSON array: [{ FileName, FileType, FileContent (base64) }]
     - Ticket → Search → TicketSQL or simple query; set limit/returnAll and ordering
     - Ticket → Get History → choose transaction types, date range, and whether to include content or attachments
     - Attachment → Get Many → scope by transactionId or ticketId with filters; optionally download content
     - Transaction → Get Many → supply TransactionSQL query
     - User/Queue → Get Many → use filters and pagination

4. Optional settings:
   - Simplify Output: flatten custom fields, collapse user references, and sort keys
   - Debug (node setting): detailed request/response logging for troubleshooting

Trigger usage:
- Configure a base TicketSQL query (e.g., "Queue = 'General' AND Status = 'open'").
- Choose the field to trigger on (Created or LastUpdated).
- The trigger maintains a per-field timestamp to avoid crossover when multiple triggers are used.

## Notes

- Base URL normalization appends `/REST/2.0` automatically to your instance URL.
- Accept: application/json is set for requests.
- CustomFields Resource Mapper:
  - Queue-aware loading: when a queue context is available (explicit queue parameter or resolved via ticketId), custom fields are loaded from `/queue/{id}/customfields`.
  - When no queue context is available yet, the mapper returns no fields to avoid global fetch.
  - Select/Combobox fields are rendered as plain text inputs for performance.
- Attachments:
  - Text content is returned inline in JSON when downloaded.
  - Binary content is provided via n8n binary data with stable property names and preserved metadata.
- Pagination is supported across list/search operations and implemented efficiently for large result sets.

## Resources

- Request Tracker REST2 API: https://docs.bestpractical.com/rt/5.0.9/RT/REST2.html
- n8n Community Nodes: https://docs.n8n.io/integrations/#community-nodes
