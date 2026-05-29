# Design Spec: mite-mcp — Time Reporting Vertical Slice

- **Date:** 2026-05-29
- **Status:** Approved — ready to break into a plan / issues
- **Scope:** First shippable MVP of an MCP server wrapping the [mite.de API](https://mite.de/en/api/)

---

## 1. Summary

An MCP server that lets an agent (e.g. Claude) automate **time reporting** against mite.de. We
deliberately build a **vertical slice** around time reporting rather than full API coverage —
roughly 30% of the API surface for ~90% of the value.

The **dominant operation is creating time entries** (`create_time_entry`). Every other tool either
supports it (find a project → create an entry) or serves read/reporting.

The whole slice (Increments 0–5, incl. the defaults layer) ships as **one MVP**. The increment list
in §10 is the **build order**, not separate releases.

---

## 2. Goals, Non-Goals

### Goals
- Agent can create, read, update, delete time entries and run grouped reports.
- Agent can control the running timer (tracker).
- Agent can resolve project/service/customer names to IDs.
- Minimal friction for the dominant case (create) via per-repo defaults.

### Non-Goals (deliberate, YAGNI)
- Admin CRUD on customers/projects/services/users (read/search only for those).
- Multi-user / multi-account mode.
- Email+password auth.
- Global-server mode with agent-supplied `scope` (the contract leaves room for it — see §6 — but we
  do not build it now).
- Note templates, default minutes, or any mini-CRM in the defaults layer.

---

## 3. Key Decisions

| Area | Decision |
|------|----------|
| **MVP scope** | Full reporting slice in one release (option "C"); Increments 0–5 = build order. |
| **Auth** | API key, single-user. `MITE_ACCOUNT` + `MITE_API_KEY` from env, `X-MiteApiKey` header. |
| **Names vs. IDs** | Hybrid: thin CRUD (takes IDs) + separate `find_*` tools that resolve names. |
| **Write safety** | Risk-tiered. Reversible ops (`create`, tracker start/stop) act immediately (`preview:true` optional). Destructive ops (`update`, `delete`) are dry-run by default + `confirm:true`. |
| **Defaults** | Per-repo. `scope` derived from environment (env → git), never authored by the LLM. Own store. Global mode deferred. |
| **Docs** | "DDD-light": `CONTEXT.md` glossary + `docs/adr/`. **Not** full DDD modeling — this is an anti-corruption layer over a CRUD REST API. |

---

## 4. Confirmed API Facts (from mite docs)

- **Base:** `https://{account}.mite.de`, `.json` format.
- **Auth:** header `X-MiteApiKey: <key>` (GET also accepts `?api_key=` — we use the header).
- **Time** is stored in **minutes**. **Dates:** keywords (`today`, `yesterday`, `this_week`,
  `last_week`, `this_month`, `last_month`, `this_year`, `last_year`) or `YYYY-MM-DD`.
- `GET /myself.json` → current user (`id`, `name`, `email`, `role`). `GET /account.json` → account.
- `GET /time_entries.json` — filters: `at`/`from`/`to`, `project_id`, `service_id`, `customer_id`,
  `user_id` (or `current`), `billable`, `locked`, `tracking`, `note`, `sort`, `direction`,
  `group_by`, `limit`, `page`.
- `group_by` (project/customer/service/user/day/week/month/year, comma-combinable) returns
  `time_entry_group` objects with `minutes`, `revenue`, and the grouping key — this *is* the report.
- `GET /time_entries/:id.json`; `POST /time_entries.json`; `PATCH /time_entries/:id.json`;
  `DELETE /time_entries/:id.json`. Entry fields: `id`, `date_at`, `minutes`, `note`, `billable`,
  `locked`, `revenue`, `hourly_rate`, plus `*_id`/`*_name` for user/project/customer/service.
  All create fields are optional (`date_at` defaults to today, `minutes` to 0).
- A locked entry returns `423 Locked`; admins override with `force:true` (out of MVP scope).
- **Tracker:** `GET /tracker.json` (current), start `PATCH /tracker/:id.json` where `:id` is an
  **existing** `time_entry`, stop `DELETE /tracker/:id.json` (idempotent). One tracker per user.
- `GET /projects.json?name=` — partial, case-insensitive match; also `customer_id`, `limit`, `page`;
  archived via `GET /projects/archived.json`. Same shape for services and customers.

---

## 5. Architecture

Shared kernel first; resource tools sit on top of it. Each module has one clear purpose.

```
src/
  mite/
    client.ts     # fetch, auth, pagination, error mapping (401/404/422/423/5xx)
    schemas.ts    # zod: mite resources + tool inputs
    format.ts     # response shaping, minutes<->hours, dates
    defaults.ts   # per-scope defaults store (JSON file, atomic write) + scope resolution
  tools/
    timeEntries.ts  # list / get / create / update / delete
    tracker.ts      # get / start / stop
    resolve.ts      # find_project / find_service / find_customer / whoami
    defaults.ts     # set_default / get_default / clear_default / list_defaults
    register.ts     # registers all tools on the server
  index.ts          # server bootstrap (thin; `ping` kept as a health check)
CONTEXT.md          # domain glossary
docs/adr/           # architecture decision records
```

**Layering rule:** `tools/*` never call `fetch` directly — only via `MiteClient`. `MiteClient` knows
nothing about MCP. This keeps tools testable against a mocked client.

---

## 6. Tool Surface (MVP)

### Read
- **`whoami`** — `GET /myself.json` (+ `account.json`); returns user id/name/role and account name.
- **`list_time_entries`** — filters per §4; shaped output (hours alongside minutes). **For inspecting
  individual entries, NOT for totals** (it is paginated).
- **`get_time_entry`** — by id.
- **`report_time`** — **the only aggregation path**, via `group_by`; returns groups with
  minutes/hours/revenue.
- **`get_tracker`** — current running timer.
- **`find_project` / `find_service` / `find_customer`** — name search (partial, case-insensitive),
  active by default, archived optional. On multiple hits they return a **candidate list** (no guessing).

### Write
- **`create_time_entry`** — `project_id`, `service_id`, `minutes`|`hours`, `note`, `date_at`
  (omit = today; no client-side date math), `billable`, optional `scope` (§7). **Acts immediately.**
  `preview:true` returns a preview without writing. The response includes resolved project/service names.
- **`update_time_entry`** — id + fields. **Dry-run by default**, `confirm:true` executes. Handles
  `423 Locked` with a clear message.
- **`delete_time_entry`** — **dry-run by default**, `confirm:true` executes.
- **`start_tracker`** — takes `time_entry_id`; optionally entry fields → create-then-start (the
  create part follows `create_time_entry` semantics: acts immediately, `preview:true` optional).
- **`stop_tracker`** — with no id, stops the current entry (calls `get_tracker` internally); idempotent.
  Start/stop are reversible, so they act immediately (no dry-run).

### Defaults (per-repo)
- **`set_default(scope, {project_id, service_id})`** — writes; returns resolved names.
- **`get_default(scope)` / `clear_default(scope)` / `list_defaults()`**.

---

## 7. Defaults — Mechanics

**Why:** the user should not have to name the project/customer on every entry. We bind
"context → project".

**Store:** `~/.config/mite-mcp/defaults.json`:
```json
{ "scopes": { "<scope-key>": { "project_id": 123, "service_id": 45 } } }
```
We keep only `project_id` + `service_id`. The customer is derivable from the project, so we do not
duplicate it. **Atomic write** (write-temp-then-rename) because two server processes may write the
same file.

**Scope resolution (priority chain; the key is NEVER authored by the LLM):**
1. Explicit `scope` in the call — highest priority (the bridge to global mode; **not built now**).
2. `MITE_DEFAULT_SCOPE` from env (set in the repo's `.mcp.json`).
3. Normalized git remote URL of the repo (stable across clones) → fallback: repo root path.
4. None → server returns a structured "no default; here are existing scopes; set via `set_default`".

In per-repo mode (the MVP mode) the server runs from the repo's `.mcp.json`, the agent omits `scope`,
and the key comes from env/git → no drift, because the model does not author the key.

**`create` with a default:** when `project_id`/`service_id` are omitted, the server pulls them from
the default and the response **returns the resolved names** ("Logged 2h: Acme Website / Development").
Confirmation is that returned line — there is no server-side "awaiting confirmation" state (which would
deadlock unattended automation).

**Flows:**
- *First time:* `create` (no IDs) → "no default" → `find_project` → user picks → `set_default` →
  `create` → created.
- *Subsequent:* `create` (no IDs) → server pulls default → creates → returns names for verification.

---

## 8. Cross-Cutting Concerns

### Error handling
`MiteClient` maps to structured messages without leaking raw mite responses:
- `401` → bad `MITE_API_KEY`/`MITE_ACCOUNT`.
- `404` → resource not found.
- `422` → validation (e.g. missing required field).
- `423` → entry locked (clear message, no `force`).
- `5xx` → mite-side error.

### Conversions & conventions
- Time is canonically **minutes** (as in mite); `create`/`update` accept `minutes` **or** `hours`
  (converted); reads show both.
- "Today" omits `date_at` (mite defaults to today) — avoids timezone drift.

---

## 9. Testing (TDD, Vitest)

- **Unit:** error mapping in `client.ts` (mock `fetch`), `format.ts` helpers, scope resolution and
  atomic write in `defaults.ts`.
- **Tool handlers** against a **mocked `MiteClient`** — including: `preview:true`/dry-run do **not**
  call writes; the "no default" fallback.
- **Live integration:** optional, behind env (`MITE_LIVE_TEST`), excluded from CI.

---

## 10. Build Order (increments; all in one MVP)

| # | Increment | Delivers | Verify |
|---|-----------|----------|--------|
| 0 | Kernel + tracer | `client.ts`, `format.ts`, `schemas.ts`, `whoami` | `whoami` returns your user from the real account |
| 1 | Read + name resolution | `find_project/service/customer`, `list_time_entries` | find a project by name, list your entries |
| 2 | Reporting | `report_time`, `get_time_entry` | monthly hours-per-project match mite |
| 3 | Thin create | `create_time_entry` (immediate, `preview:true`) | entry appears in mite; preview creates nothing |
| 4 | Remaining writes | `update`/`delete` (dry-run), tracker get/start/stop | edits/deletes stay dry-run; timer works |
| 5 | Defaults | `defaults.ts`, `set/get/clear/list_default`, `create` pulls default | in a repo with a default, "log 2h" creates without naming the project |

**Why this order:** every writable resource must first be readable/findable (find/list before create);
defaults sit on a working create, so they come last; `whoami` as a cheap tracer catches a bad key/account early.

---

## 11. ADRs (written alongside the increment that resolves them, lazily)

- `0001-api-key-auth-single-user` (Inc. 0)
- `0002-acl-not-ddd` — we wrap the API, we do not model the domain (Inc. 0)
- `0003-minutes-canonical-hours-convenience` (Inc. 0)
- `0004-create-immediate-other-writes-dry-run` (Inc. 3)
- `0005-per-repo-scope-defaults` — including the deferred bridge to global mode (Inc. 5)

`CONTEXT.md` (glossary: account, time entry, service, project, customer, tracker, locked, billable,
grouping, scope, default) is seeded in Inc. 0 and grown. `README` + an example per-repo `.mcp.json`
land at the end of Inc. 5.
