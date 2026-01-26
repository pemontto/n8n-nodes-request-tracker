# Ticket Include Related Data - Plan

> Add boolean options to Ticket Get/Search operations to fetch related data (history, comments) in parallel authenticated HTTP requests with concurrency limits.

---
<!-- PROGRESS SECTION -->

### Progress Summary

* [ ] **Research & Strategy Selection** 🟡 Planned
  - Explore existing patterns (processTransactions concurrency)
  - Evaluate approach options for parallel fetching
  - Select and document strategy

<!-- Task links will be added in Phase 4 -->

<!-- END PROGRESS SECTION -->

---

## Research & Strategy Selection
**Status**: 🟢 **In Progress**

### Goal
Determine the best approach to add "Include History" and/or "Include Comments" boolean options to Ticket Get and Ticket Search operations, fetching related data via parallel authenticated HTTP requests with a concurrency limit.

### Context
When users fetch tickets, they often need related data like transaction history or comments. Currently, this requires separate operations. The goal is to add optional boolean flags that:
1. When enabled, make additional API calls to fetch related data
2. Run these calls in parallel (up to a concurrency limit, e.g., 12)
3. Merge the results into the ticket response

Reference: `processTransactions` in GenericFunctions.ts already implements a similar pattern with `TRANSACTION_CONCURRENCY = 12` for fetching attachments in parallel.

**Action Items**:

- [x] Review existing `processTransactions` pattern for parallel requests
- [x] Examine Ticket Get and Search operations to understand current structure
- [x] Identify what related data makes sense to include (history, comments, etc.)
- [x] Identify 2-3 viable approach options
- [ ] Present findings and trade-offs to user
- [ ] Get user confirmation on selected approach

### Key Findings

1. **Existing Concurrency Pattern** (`GenericFunctions.ts:1265-1275`):
   - `TRANSACTION_CONCURRENCY = 12` for batch processing
   - Uses `Promise.all` with sliced batches
   - `fetchAttachmentsBulk()` fetches attachments for multiple transactions in one API call

2. **Current Architecture**:
   - Ticket Get uses declarative routing (`GET /ticket/{id}`) with `transformTicketData` postReceive hook
   - Ticket Search uses declarative routing (`POST /tickets`) with pagination and `transformTicketData` hook
   - PostReceive hooks have access to `this.helpers.httpRequestWithAuthentication` for additional API calls

3. **Related Data Available via RT API**:
   - **History/Transactions**: `GET /ticket/{id}/history` - already implemented in "Get History" operation
   - **Comments**: Subset of history (filtered by `Type = 'Comment'`)
   - **Correspondence**: Subset of history (filtered by `Type = 'Correspond'`)
   - Attachments are part of transactions, already handled by `processTransactions`

4. **Architectural Constraint**:
   - Declarative routing executes the initial HTTP request automatically
   - PostReceive hooks run AFTER the response and can make additional HTTP calls
   - This is the ideal hook point for fetching related data

### Strategy Proposals

**Option A: PostReceive Hook Extension (Recommended)**
- Description: Add "Include History" boolean option to Ticket Get/Search. Create a new `includeRelatedData` postReceive hook that fetches history for each ticket in parallel (with concurrency limit) and merges it into the ticket response as a `History` array.
- Implementation:
  - Add `includeHistory` boolean parameter to Get and Search operations
  - Create `includeRelatedData()` postReceive function in GenericFunctions.ts
  - For Get (single ticket): fetch `/ticket/{id}/history`, reuse `processTransactions` for attachment handling
  - For Search (multiple tickets): batch tickets, fetch history in parallel with `TRANSACTION_CONCURRENCY = 12`
  - Merge history into each ticket's response as `ticket.History = [...]`
- Pros:
  - Minimal changes to existing architecture
  - Reuses proven patterns (`processTransactions`, concurrency batching)
  - Keeps declarative routing benefits
  - Single API call per ticket for history
- Cons:
  - For Search with many tickets, could be slow (N additional API calls, though parallelized)
  - Need to handle pagination of history within each ticket

**Option B: Separate "Enrich" Operation**
- Description: Instead of modifying Get/Search, create a new "Enrich" operation that takes ticket data as input and adds related data.
- Implementation:
  - New operation: `Ticket > Enrich`
  - Input: ticket data from previous node
  - Options: Include History, Include Comments (filtered history), Include Correspondence
  - Fetches related data and merges into input
- Pros:
  - No changes to existing Get/Search operations
  - More flexible - can enrich any ticket data from any source
  - Cleaner separation of concerns
- Cons:
  - Requires two nodes in workflow (Search → Enrich)
  - Less convenient for simple use cases
  - May be confusing UX-wise

**Option C: Keep Operations Separate (Status Quo)**
- Description: Don't modify Get/Search. Users continue using "Get History" as a separate operation.
- Implementation: No changes needed
- Pros:
  - Zero risk
  - Existing "Get History" works well
- Cons:
  - Less convenient - requires multiple nodes
  - Users must loop through search results manually to get history for each

### Selected Approach

> **IMPORTANT**: Fill this section AFTER user confirms the selected strategy

**Decision**: [Which approach was selected]

**Rationale**: [Why this approach was chosen]

**Key Findings**:
- [Finding 1]
- [Finding 2]

**Implementation Plan**:
- [High-level step 1]
- [High-level step 2]

### Dependencies
- RT REST2 API endpoints for history/transactions
- Existing `processTransactions` pattern

### Related Files
- `nodes/RequestTracker/GenericFunctions.ts` - Contains processTransactions pattern
- `nodes/RequestTracker/resources/ticket/index.ts` - Ticket operations
- `nodes/RequestTracker/resources/ticket/get.ts` - Get operation
- `nodes/RequestTracker/resources/ticket/search.ts` - Search operation

---

## Implementation Tasks

> Task files will be created in the `tasks/` subfolder during Phase 4 of the structured plan mode workflow.

---

## Lessons Learned (Post-Implementation)

> Fill this section out after completing the feature

### What Went Well
- [Success 1]

### What Could Be Improved
- [Area for improvement 1]

### Unexpected Challenges
- [Challenge 1 and how it was resolved]

### Recommendations for Future Features
- [Recommendation 1]

---

<!-- META_INFORMATION -->
## Task Status Legend
- 🔴 **Blocked**: Requires external dependency or decision
- 🟡 **Planned**: Ready to implement
- 🟢 **In Progress**: Currently being worked on
- ✅ **Completed**: Done

## Change Log

- **2026-01-08**: Initial plan creation
<!-- META_INFORMATION -->
