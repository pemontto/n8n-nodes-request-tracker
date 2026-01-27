# Trigger Time Limits - Plan

---
<!-- PROGRESS SECTION -->

### Progress Summary

* [x] **Research & Strategy Selection** ✅ Completed
  - Explore current trigger implementation
  - Evaluate approach options for time limits
  - Select and document strategy

* [x] [**T01**: Update TicketSQL description with time constraint guidance](tasks/T01.md) - Status: ✅ Completed
* [ ] [**T02**: Add time backstop to all trigger modes](tasks/T02.md) - Status: 🟡 Planned
* [ ] [**T03**: Add "New Ticket by ID" trigger mode](tasks/T03.md) - Status: 🟡 Planned

<!-- END PROGRESS SECTION -->

---

## Research & Strategy Selection
**Status**: ✅ **Completed**

### Goal
Determine optimal approach to prevent unbounded SQL queries in the Request Tracker Trigger node that could cause performance issues or timeouts.

### Context
- Users can enter any TicketSQL query in the trigger's `ticketSql` parameter
- In **manual mode** (testing), the query runs without time filter - could return thousands of tickets
- In **normal polling mode**, time filter is appended but user could still write queries matching huge datasets
- Need a safety mechanism to limit query scope

### Current Implementation
- **Manual mode**: Uses raw `ticketSql` with no time filter, limit capped at 10
- **Polling mode**: Appends `${triggerOnField} > '${lastChecked}'` to user query
- `triggerOnField` can be `LastUpdated` or `Created`
- Has `limit` option (default 50, max 100) but this only limits results, not query scope

**Action Items**:

- [x] Review existing trigger implementation
- [x] Analyze RT API query behavior for large datasets
- [x] Identify 2-3 viable approach options
- [x] Present findings and trade-offs to user
- [x] Get user confirmation on selected approach

### Strategy Proposals

> **Fill this during research as you discover options**

**Option A: Auto-inject time window (backstop)**
- Description: Always inject a time constraint based on `triggerOnField` (e.g., last X minutes/hours)
- User-configurable window with sensible default
- Pros: Guarantees bounded queries, transparent to user
- Cons: May miss tickets if window too small, adds complexity

**Option B: Warning/validation only**
- Description: Warn users in UI description about adding time limits, validate query doesn't return too many results
- Pros: Non-intrusive, user controls
- Cons: Doesn't prevent the problem, reactive not proactive

**Option C: Configurable "backstop" option**
- Description: Add optional "Enable time backstop" toggle with configurable duration
- In manual mode: limit to last N minutes based on `triggerOnField`
- In polling mode: already has time filter, backstop optional
- Pros: User choice, explicit behavior, flexible
- Cons: Extra config options, users may not enable it

### Selected Approach

**Decision**: Option B + Additional features based on further discussion

**Rationale**:
- Initial docs change complete
- User requested additional safety: time backstop for all modes
- User requested new trigger mode: track highest ticket ID for new tickets

**Key Findings**:
- Manual mode unbounded except for result limit (10)
- Polling mode already time-bounded by lastChecked timestamp
- RT queries without time constraints can return 100k+ tickets
- n8n doesn't enforce lookback caps, but user wants one
- For new tickets, ID-based tracking simpler than timestamp

**Implementation Plan**:
1. ~~Update `ticketSql` description~~ (T01 done)
2. Add time backstop to all modes (min = poll interval)
3. Add "New Ticket by ID" trigger mode - track highest ID, trigger on new higher IDs

### Dependencies
- None identified

### Related Files
- `nodes/RequestTracker/RequestTrackerTrigger.node.ts` - Main trigger implementation

---

## Implementation Tasks

> Task files will be created in the `tasks/` subfolder during Phase 4 of the structured plan mode workflow.

---

## Lessons Learned (Post-Implementation)

> Fill this section out after completing the feature

### What Went Well
- [TBD]

### What Could Be Improved
- [TBD]

### Unexpected Challenges
- [TBD]

### Recommendations for Future Features
- [TBD]

---

<!-- META_INFORMATION -->
## Task Status Legend
- 🔴 **Blocked**: Requires external dependency or decision
- 🟡 **Planned**: Ready to implement
- 🟢 **In Progress**: Currently being worked on
- ✅ **Completed**: Done

## Change Log

- **2026-01-15**: Initial plan created - research in progress
<!-- META_INFORMATION -->
