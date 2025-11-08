# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an n8n community node package for Request Tracker (RT5+) that integrates the RT REST2 API into n8n workflows. The node uses n8n's declarative routing system to interact with the Request Tracker REST2 API.

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

This follows the standard n8n community node architecture with declarative routing:

1. **Main Node** ([nodes/RequestTracker/RequestTracker.node.ts](nodes/RequestTracker/RequestTracker.node.ts))
   - Implements `INodeType` interface
   - Defines `requestDefaults` with base URL construction: `{{$credentials.rtInstanceUrl}}/REST/2.0`
   - Sets headers: `Accept: application/json`, `Content-Type: application/json`
   - Aggregates resource descriptions (currently only Ticket)
   - Supports `usableAsTool: true` for AI agent integration

2. **Credential Type** ([credentials/RequestTrackerApi.credentials.ts](credentials/RequestTrackerApi.credentials.ts))
   - Implements `ICredentialType` interface
   - Uses token-based authentication: `Authorization: token {{$credentials.apiToken}}`
   - Includes credential test endpoint: `GET /REST/2.0/rt`
   - Fields: `rtInstanceUrl`, `apiToken`

3. **Resource Structure** (under `nodes/RequestTracker/resources/`)
   - Each resource has its own directory (e.g., `ticket/`)
   - `index.ts`: Exports resource description array with operations
   - Operation files (e.g., `get.ts`): Define operation-specific field descriptions
   - Uses declarative `routing` objects within operation definitions for HTTP requests

### Declarative Routing Pattern

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

### Adding New Operations/Resources

1. Create operation description file in `resources/<resource>/<operation>.ts`
2. Export `INodeProperties[]` with field definitions and `displayOptions`
3. Add operation to resource's `index.ts` with inline routing configuration
4. If new resource, import and spread description in main node properties

### Code Style

- **Indentation**: Tabs (width 2)
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Trailing commas**: All
- **Line width**: 100 characters
- **TypeScript**: Strict mode enabled with comprehensive strictness flags

## Current Implementation Status

**Implemented**:
- Ticket resource with Get operation (by ID)

**Planned** (per README):
- Transactions
- Attachments
- Users
- Queues

## RT REST2 API Details

- Base path: `/REST/2.0`
- Authentication: `Authorization: token <API_TOKEN>` header
- Content-Type: `application/json`
- API Documentation: https://docs.bestpractical.com/rt/5.0.9/RT/REST2.html

## Build Output

- Source: `credentials/`, `nodes/`
- Output: `dist/` (committed to repo for npm publishing)
- TypeScript config includes declaration files and source maps
- Only `dist/` is included in published package (see `files` in package.json)
