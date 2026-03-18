# BLU Crew Commercial ERP — CLAUDE.md

## Identity
You are the build engineer for the BLU Crew Commercial ERP MVP.
BLU Crew is a post-construction cleaning company. This ERP runs
the commercial sales-to-handoff pipeline: Clients, Pursuits,
Estimates, Proposals, Awards, Compliance, Handoff, Change Orders,
and Expansion Opportunities.

## Source of Truth Hierarchy (MANDATORY)
When documents conflict, this order wins:
1. ERP-01 → scope/phase boundaries
2. ERP-02 → canonical entities, fields, enums
3. ERP-03 → state transitions, approvals, automations
4. ERP-04 → roles and permissions
5. ERP-05 → integration contracts
6. ERP-06 → UAT scenarios and expected behavior
7. CORE-01→07 → operating process (when build docs are silent)

Spec documents live in /docs/specs/. Read them before building.

## Non-Negotiable Build Rules
- NEVER collapse Client, Pursuit, Estimate, Proposal, Award,
  Change Order into one generic record type
- NEVER invent lifecycle stages, enums, or approval gates not
  defined in ERP-02/03
- NEVER allow status jumps that skip required entry criteria
- NEVER hard-delete business records. Soft-delete/archive only.
- NEVER create bi-directional sync with external systems in v1
- NEVER replace SharePoint as file SOT. Store links + metadata only.
- NEVER build Phase 2/3 scope unless explicitly told to

## Tech Stack (ACTUAL)
- Next.js 16 App Router, TypeScript strict
- Microsoft Entra (Azure AD) for authentication / SSO
- File-based JSON DB at .data/workflow-db.json
- Zustand for client-side global state (actor/session context)
- React Hook Form + Zod for form validation
- TanStack Table for sortable, filterable data tables
- shadcn/ui + Radix UI + Tailwind CSS v4
- Recharts for KPI dashboards and pipeline charts
- Lucide React for icons
- Sonner for toast notifications
- Azure App Service (Linux, Node 22) for hosting
- GitHub Actions for CI/CD
- Sentry for error tracking
- Vitest for testing (543+ existing tests)

## Database Pattern
This app uses a file-based JSON store at .data/workflow-db.json.
All entity reads/writes go through the data access layer.
Do NOT import from drizzle-orm, postgres, or @supabase/*.
Follow the same JSON DB pattern used by existing workflow records.
When the app migrates to SQL later, only the data access layer changes.

## Auth Pattern
This app uses Microsoft Entra (Azure AD) SSO via the existing M365 tenant.
The current user and their roles come from the Entra session.
Do NOT import from @supabase/ssr or @supabase/supabase-js.
Use the existing auth helper to get the current user context.

## Live Integrations
- GHL: LIVE — 72k contacts, 41k opportunities synced
- SharePoint: LIVE — Graph API for document storage and folder creation
- Jobber: Local only (hosted instance disconnected)
- Outlook: Needs device re-auth for Graph API
- Teams: Architecture TBD — stub notifications for now
- QuickBooks: Health check only — not primary KPI source
- Gusto: Payroll context only

## Architecture Patterns
- All entities use UUID primary keys + human-readable reference IDs
- Every create/update/delete logs: actor, timestamp, entity_id,
  field_changes, reason (where applicable)
- Enum values come from ERP-02 Key Enum Anchors as TypeScript unions
- State transitions validated server-side per ERP-03 matrix
- Blocked transitions return explicit error with reason and required action
- External system IDs stored as indexed reference fields (ghl_company_id, etc.)
- Permission checks use the pure-logic role matrix in src/lib/permissions/

## Entity Build Pattern (follow for every entity)
1. TypeScript interface in src/types/commercial.ts
2. Enum union types alongside the interface
3. Data access functions (read/write to JSON DB)
4. Server actions in src/actions/{entity}/
5. Validation with Zod schemas in src/lib/validations/{entity}.ts
6. State machine in src/lib/state-machines/{entity}.ts
7. UI components in src/components/{entity}/
8. Page routes in src/app/(dashboard)/{entity}/
9. Tests in src/tests/{entity}/

## State Machine Pattern
Every entity with a lifecycle gets a state machine file.
These are PURE LOGIC — no DB dependency:
- Define allowed transitions as a typed map
- Each transition has: fromStates[], toState, requiredFields[],
  requiredRoles[], sideEffects[], blockers[]
- Validate transitions server-side before any DB write
- Log every transition with full audit context

## UI Patterns (from ERP-09)
- Use TanStack Table for all list views (sortable, filterable)
- Use React Hook Form + Zod for all forms
- Use Recharts for dashboard visualizations
- Every entity workspace: header → state ribbon → action bar →
  tabbed content → right-rail cards → activity timeline
- Breadcrumbs always show: Module > Parent Entity > Current Record
- State ribbon shows: current state, next required action, blockers
- Quick-create menu in header for Client, Pursuit, Estimate,
  Proposal, Change Order, Expansion
- Blocked transitions show WHY blocked and WHAT to do next

## Testing Rules
- Write tests BEFORE implementation when possible
- Every state transition must have a test
- Every blocked transition must have a test
- Every permission boundary must have a test
- Use ERP-06 seeded sample records as test fixtures
- Run tests after every file change
- Target: 600+ tests all passing

## Commit Convention
- feat({entity}): {description} — new features
- fix({entity}): {description} — bug fixes
- test({entity}): {description} — test additions
- docs: {description} — documentation updates

## When Uncertain
1. Check the spec docs in /docs/specs/ before guessing
2. If specs are silent, ask — do not invent
3. If two specs conflict, the higher-priority doc wins per hierarchy
4. Log any ambiguity in /docs/decisions/ as a decision record
