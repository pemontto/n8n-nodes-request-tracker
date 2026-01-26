# Custom Field Name Resolution for Get History - Plan

---
<!-- PROGRESS SECTION -->

### Progress Summary

* [x] **Research & Strategy Selection** ✅ Completed
  - ✅ Explored RT API custom field endpoints
  - ✅ Confirmed transaction Field format (numeric ID only)
  - ✅ Evaluated 3 resolution approaches
  - ✅ Selected Option A: Batch Fetch with IN Operator

* [x] [**T01**: Implement Custom Field Name Resolution in processTransactions](tasks/T01.md) - Status: ✅ Completed

<!-- END PROGRESS SECTION -->

---

## Research & Strategy Selection
**Status**: ✅ **Completed**

### Goal
Resolve custom field names from IDs in `Get Ticket History` transactions. Currently, when a custom field is modified, the transaction's `Field` property contains a numeric ID (e.g., "12345") rather than the human-readable field name.

### Context
The `Get History` operation returns transactions from RT's `/ticket/{id}/history` endpoint. For `CustomField` type transactions (and potentially `Set` transactions affecting custom fields), the `Field` property contains an identifier rather than the field name, making it difficult for users to understand which custom field changed.

**Current behavior example:**
```json
{
  "id": "789",
  "Type": "CustomField",
  "Field": "12345",
  "OldValue": "Low",
  "NewValue": "High"
}
```

**Desired behavior** (after implementation):
```json
{
  "id": "789",
  "Type": "CustomField",
  "Field": "Severity",
  "FieldId": "12345",
  "OldValue": "Low",
  "NewValue": "High"
}
```
(Field contains the human-readable name, FieldId preserves the original numeric ID)

**Action Items**:

- [x] Investigate RT API transaction response format for CustomField changes
- [x] Research RT API endpoints for custom field metadata lookup
- [x] Identify 2-3 viable approach options
- [x] Present findings and trade-offs to user
- [x] Get user confirmation on selected approach

### Research Findings

**Transaction Field Format**: Confirmed with user that the `Field` property contains just the numeric custom field ID (e.g., `"12345"`), not `CF.{id}` or the field name.

**Available RT API Endpoints**:
- `GET /customfield/{id}` - Retrieve single custom field metadata (includes Name)
- `POST /customfields` - Search custom fields with JSON filter syntax, supports `IN` operator

**Existing Pattern in Codebase**: The `fetchAttachmentsBulk` function (GenericFunctions.ts:1085-1208) already uses the `IN` operator to batch-fetch multiple records efficiently:
```typescript
const filterBody = [
  {
    field: 'TransactionId',
    operator: 'IN',
    value: transactionIds.map(id => parseInt(id, 10)),
  },
];
```
This same pattern can be applied to custom fields.

### Strategy Proposals

**Option A: Batch Fetch Custom Fields with IN Operator (Recommended)**
- Description: After receiving transactions, collect unique CF IDs from `Field` properties, make a single `POST /customfields` request with `id IN [...]` filter, build an ID→Name map, then enrich all transactions
- Pros:
  - Single API call regardless of how many unique CFs changed
  - Proven pattern already used in codebase (`fetchAttachmentsBulk`)
  - Efficient for typical ticket histories (usually <10 unique CF changes)
- Cons:
  - One additional API call per `Get History` request
  - If >100 custom fields referenced (unlikely), needs pagination

**Option B: On-Demand Individual Fetch**
- Description: For each unique custom field ID found, make individual `GET /customfield/{id}` calls
- Pros:
  - Simpler implementation
  - No need to handle search/filter syntax
- Cons:
  - N API calls for N unique custom fields (slow for histories with many CF changes)
  - No real advantage over batch approach

**Option C: Optional/Lazy Resolution**
- Description: Add a parameter `resolveCustomFieldNames` (default: true). When enabled, use Option A approach. When disabled, skip resolution for faster performance
- Pros:
  - User control over API call overhead
  - Backward compatible (enable by default)
- Cons:
  - Additional parameter complexity
  - Most users will always want names resolved

### Selected Approach

**Decision**: Option A - Batch Fetch Custom Fields with IN Operator

**Output Format**: Replace `Field` with the resolved name, add `FieldId` for the original numeric ID
```json
// Before
{ "Type": "CustomField", "Field": "12345", "OldValue": "Low", "NewValue": "High" }

// After
{ "Type": "CustomField", "Field": "Severity", "FieldId": "12345", "OldValue": "Low", "NewValue": "High" }
```

**Rationale**:
- Single API call is most efficient regardless of how many custom fields changed
- Pattern already proven in codebase (`fetchAttachmentsBulk`)
- Clean output format with human-readable field name while preserving ID for programmatic use

**Key Findings**:
- Transaction `Field` property contains just the numeric ID (e.g., "12345")
- RT API supports `POST /customfields` with JSON filter including `IN` operator
- Existing `fetchAttachmentsBulk` function provides a template for implementation

**Implementation Plan**:
1. Add `fetchCustomFieldsBulk()` function to GenericFunctions.ts
2. Modify `processTransactions()` to collect unique CF IDs from transactions
3. Call bulk fetch for CF metadata when CF IDs are found
4. Transform transactions: set `Field` to name, add `FieldId` with original ID
5. Handle edge cases (missing CF, deleted CF, no CF transactions)

### Dependencies
- RT REST2 API access
- Understanding of RT's custom field object structure

### Related Files
- `nodes/RequestTracker/GenericFunctions.ts`:
  - `fetchCustomFieldsBulk` (lines 1214-1307) - NEW: Bulk CF metadata lookup
  - `processTransactions` (lines 1314-1810) - Modified: CF ID collection + resolution
- `nodes/RequestTracker/resources/ticket/index.ts` - Get History operation routing
- `nodes/RequestTracker/resources/ticket/getHistory.ts` - Get History UI parameters

---

## Implementation Tasks

> Task files will be created in the `tasks/` subfolder during Phase 4 of the structured plan mode workflow.

---

## Lessons Learned (Post-Implementation)

### What Went Well
- Existing `fetchAttachmentsBulk` pattern provided clear template for bulk API calls
- RT API supports standard JSON filter syntax with IN operator for efficient batch queries
- Implementation cleanly integrates with existing processTransactions flow

### What Could Be Improved
- Could add caching for CF lookups if performance becomes an issue with large histories

### Unexpected Challenges
- None - straightforward implementation

### Recommendations for Future Features
- When adding new bulk lookup patterns, follow the same structure: collect IDs → batch fetch → map lookup

---

<!-- META_INFORMATION -->
## Task Status Legend
- 🔴 **Blocked**: Requires external dependency or decision
- 🟡 **Planned**: Ready to implement
- 🟢 **In Progress**: Currently being worked on
- ✅ **Completed**: Done

## Change Log

- **2026-01-15**: Initial plan created - Research phase started
- **2026-01-15**: Research completed - Selected Option A: Batch Fetch with IN Operator
- **2026-01-15**: Task breakdown complete - Created T01
- **2026-01-15**: T01 implemented - Custom field name resolution complete
<!-- META_INFORMATION -->
