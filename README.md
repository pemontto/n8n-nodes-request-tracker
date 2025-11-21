# n8n-nodes-request-tracker

This is an n8n community node for Request Tracker (RT5+). It lets you use the RT REST2 API in your n8n workflows.

[n8n](https://n8n.io/) is a fair-code licensed workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

Initial scope (implemented):
- Ticket
  - Get a ticket by ID

Planned additions:
- Transactions
- Attachments
- Users
- Queues

## Credentials

Use API Token authentication for RT REST2.

- Fields:
  - RT Instance URL (e.g. https://rt.mycompany.com)
  - API Token

Authorization header format:
- Authorization: token <API_TOKEN>

Connectivity test:
- The credential performs a simple request to your RT instance (REST2 entry) to verify reachability.

## Compatibility

Compatible with n8n@1.60.0 or later.

## Usage

1. In n8n, create a new credential:
   - Request Tracker API
   - RT Instance URL: e.g. https://rt.mycompany.com
   - API Token: your RT API token

2. Add the node "Request Tracker (RT5)" to your workflow.

3. Select Resource "Ticket" and Operation "Get".

4. Enter the Ticket ID (numeric) and execute the node.

5. The node returns the ticket payload as JSON.

## Notes

- Base URL handling ensures your instance URL is normalized and the node targets RT REST2: `<RT Instance URL>/REST/2.0`.
- The node sets Accept: application/json.
- Future operations/resources will follow the same design pattern with option-based routing.

## Resources

- Request Tracker REST2 API docs: https://docs.bestpractical.com/rt/5.0.9/RT/REST2.html
- n8n community nodes documentation: https://docs.n8n.io/integrations/#community-nodes
