# Optional Output Fields Feature

## Summary

Add optional `outputFields` parameter to control which fields are returned from RT API. When specified, overrides our default field lists while still allowing RT's native defaults when left empty.

## Current State

- `getTicketFields()` returns hardcoded 23 ticket fields
- `getExpandedFieldParams()` returns 7 `fields[*]` params for expanding linked objects
- These are statically included in `qs` for all read operations
- No way to limit fields returned (always get full response)

## Design

### Behavior

| `outputFields` value | `fields` param | `fields[*]` params |
|---------------------|----------------|-------------------|
| Not specified/empty | `getTicketFields()` | `getExpandedFieldParams()` |
| Custom value | User's value | **Not included** |

When user specifies custom fields, they get full control - no automatic expansion of linked objects.

### Affected Operations

**With `additionalOptions` collection (add `outputFields` there):**
- Ticket > Search
- Ticket > Get History
- Transaction > Get Many
- Attachment > Get Many
- User > Get Many
- Queue > Get Many

**Standalone operations (add as direct parameter):**
- Ticket > Get
- Transaction > Get
- Attachment > Get
- User > Get
- Queue > Get

## Implementation

### 1. Add `outputFields` Parameter

For each operation, add to appropriate location:

```typescript
{
  displayName: 'Output Fields',
  name: 'outputFields',
  type: 'string',
  default: '',
  placeholder: 'Leave empty for all standard fields',
  description: 'Comma-separated list of fields to return (e.g., "id,Subject,Status"). Leave empty for standard fields.',
}
```

### 2. Modify Routing Expressions

**Before:**
```typescript
qs: {
  fields: getTicketFields(),
  ...getExpandedFieldParams(),
}
```

**After:**
```typescript
qs: {
  fields: '={{ $parameter.additionalOptions?.outputFields || "' + getTicketFields() + '" }}',
  // Conditionally spread expanded fields only when using defaults
  ...($parameter.additionalOptions?.outputFields ? {} : getExpandedFieldParams()),
}
```

**Problem:** Can't use conditional spread in static object. Need preSend hook.

### 3. Add `buildFieldsQueryParams` preSend Hook

```typescript
export async function buildFieldsQueryParams(
  this: IExecuteSingleFunctions,
  requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
  const outputFields = this.getNodeParameter('outputFields', '') as string
    || this.getNodeParameter('additionalOptions.outputFields', '') as string;

  if (!requestOptions.qs) requestOptions.qs = {};

  if (outputFields) {
    // User specified fields - use exactly what they want
    requestOptions.qs.fields = outputFields;
  } else {
    // Use defaults with expansion
    const resource = this.getNodeParameter('resource') as string;
    requestOptions.qs.fields = getDefaultFields(resource);
    Object.assign(requestOptions.qs, getExpandedFieldParams(resource));
  }

  return requestOptions;
}
```

### 4. Resource-Specific Default Field Helpers

Create helper functions for each resource:

```typescript
export function getDefaultFields(resource: string): string {
  switch (resource) {
    case 'ticket': return getTicketFields();
    case 'transaction': return 'Type,Creator,Created,Description,Field,OldValue,NewValue,Data,Object,_hyperlinks';
    case 'attachment': return 'Subject,Filename,ContentType,ContentLength,Created,Creator,TransactionId,MessageId,Headers';
    case 'user': return 'id,Name,CustomFields,EmailAddress,RealName,...';
    case 'queue': return 'id,Name,Description,Lifecycle,SubjectTag,...';
    default: return '';
  }
}

export function getExpandedFieldParams(resource?: string): IDataObject {
  // Ticket-specific expansions
  if (!resource || resource === 'ticket') {
    return {
      'fields[Queue]': 'id,Name,Description',
      'fields[Creator]': 'id,Name,RealName,EmailAddress',
      'fields[LastUpdatedBy]': 'id,Name,RealName,EmailAddress',
      'fields[Owner]': 'id,Name,RealName,EmailAddress',
      'fields[Requestors]': 'id,Name,RealName,EmailAddress',
      'fields[Cc]': 'id,Name,RealName,EmailAddress',
      'fields[AdminCc]': 'id,Name,RealName,EmailAddress',
    };
  }
  // User/Queue have Creator, LastUpdatedBy
  if (resource === 'user' || resource === 'queue') {
    return {
      'fields[Creator]': 'id,Name,RealName,EmailAddress',
      'fields[LastUpdatedBy]': 'id,Name,RealName,EmailAddress',
    };
  }
  // Transaction/Attachment have Creator
  return {
    'fields[Creator]': 'id,Name,RealName,EmailAddress',
  };
}
```

## Files to Modify

1. **GenericFunctions.ts**
   - Add `buildFieldsQueryParams` preSend hook
   - Refactor `getExpandedFieldParams()` to accept resource type
   - Add `getDefaultFields()` helper

2. **ticket/get.ts** - Add `outputFields` parameter
3. **ticket/index.ts** - Update Search, Get History routing
4. **ticket/search.ts** - Add `outputFields` to additionalOptions
5. **ticket/getHistory.ts** - Add `outputFields` to additionalOptions

6. **transaction/get.ts** - Add `outputFields` parameter
7. **transaction/index.ts** - Update Get, Get Many routing
8. **transaction/getMany.ts** - Add `outputFields` to additionalOptions

9. **attachment/get.ts** - Add `outputFields` parameter
10. **attachment/index.ts** - Update Get, Get Many routing
11. **attachment/getMany.ts** - Add `outputFields` to additionalOptions

12. **user/get.ts** - Add `outputFields` parameter
13. **user/index.ts** - Update Get, Get Many routing
14. **user/getMany.ts** - Add `outputFields` to additionalOptions

15. **queue/get.ts** - Add `outputFields` parameter
16. **queue/index.ts** - Update Get, Get Many routing
17. **queue/getMany.ts** - Add `outputFields` to additionalOptions

## Alternative: Expression-Only Approach

Could avoid preSend hook by using expressions in routing, but requires duplicating logic:

```typescript
qs: {
  fields: '={{ $parameter.outputFields || "Subject,Description,Type,..." }}',
  'fields[Queue]': '={{ $parameter.outputFields ? undefined : "id,Name,Description" }}',
  // ... repeat for all expanded fields
}
```

**Cons:** Repetitive, harder to maintain, undefined values may still be sent.

## Unresolved Questions

1. **Transaction > Get History**: Already has hardcoded fields param. Should this also be configurable?
2. **Attachment > Get Many**: Has dynamic `Content` field inclusion based on `downloadContent`. How should this interact with `outputFields`?
3. **Trigger node**: Already has `outputFields` - ensure consistency with new implementation.
