# ADR-0003: Minutes canonical, hours as a convenience

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

mite stores and returns time in **minutes**. Humans (and agents relaying human intent) usually think
in hours ("log 2h"). Aggregation must also be correct: `list_time_entries` is paginated, so summing
its pages client-side silently undercounts.

## Decision

- **Minutes are canonical**, matching mite. Internally we never convert away from minutes for storage
  or API calls.
- **Hours are a convenience** at the tool boundary: `create_time_entry`/`update_time_entry` accept
  `minutes` **or** `hours` (converted to minutes); read tools surface both.
- **All aggregation goes through `report_time`** (mite's server-side `group_by`). `list_time_entries`
  is for inspecting individual entries, never for totals.

## Consequences

- No rounding/precision drift from carrying hours as the source of truth.
- Agents get ergonomic hour-based input without the server guessing units.
- Totals are always correct regardless of pagination, because the server aggregates.

## Alternatives considered

- **Carry hours as canonical:** rejected — invites rounding errors and a mismatch with mite.
- **Let agents sum `list_time_entries`:** rejected — undercounts across pages.
