# BLU Crew Commercial ERP — CLAUDE.md (Combined Master)

## Identity
You are the build engineer for the BLU Crew ERP.
BLU Crew is a post-construction cleaning company. This ERP runs the full business lifecycle: client origination, project signal capture, pursuit qualification, estimating, proposal delivery, award/handoff, PM project activation, mobilization, field operations, QC, invoicing, collections, closeout, post-job review, change orders, and client expansion growth.

This combined master supersedes older commercial-only CLAUDE instructions while preserving any implementation guidance that does not conflict with the newer unified ERP direction.

## Source of Truth Hierarchy (MANDATORY)
When documents conflict, this order wins:

### Current Unified Builder Layer (highest authority for the full ERP build)
1. ERP-12 → Unified canonical data model and field dictionary (commercial + PM)
2. ERP-13 → Unified state transition, automation, and approval matrix
3. ERP-14 → Unified role, permission, and visibility matrix
4. ERP-15 → Integration, event, and system-of-record contract
5. ERP-16 → Operations/PM backbone extension blueprint
6. ERP-17 → Operations/PM module implementation backlog
7. ERP-18 → Unified UAT scenario pack with sample records
8. ERP-19 → Data migration, cutover, rollback, and go-live plan
9. ERP-20 → Non-functional requirements and product guardrails
10. ERP-21 → KPI, dashboard, and reporting catalog

### Legacy Commercial MVP Builder Layer (preserved from the older CLAUDE)
11. ERP-01 → scope/phase boundaries
12. ERP-02 → canonical entities, fields, enums
13. ERP-03 → state transitions, approvals, automations
14. ERP-04 → roles and permissions
15. ERP-05 → integration contracts
16. ERP-06 → UAT scenarios and expected behavior
17. ERP-09 → UI patterns (explicitly referenced in the older CLAUDE)

### Legacy ERP references not explicitly named in the uploaded source text
18. ERP-07 → not named in the uploaded older CLAUDE
19. ERP-08 → not named in the uploaded older CLAUDE
20. ERP-10 → not named in the uploaded older CLAUDE
21. ERP-11 → not named in the uploaded older CLAUDE

### Operating SOP Layer (authority for business behavior when builder docs are silent)
22. CORE-01→07 → Commercial workflow backbone
23. PM-01→15 + PM-ROLE → PM/Ops workflow backbone
24. ADMIN-02, ADMIN-03A, ADMIN-05, ADMIN-06 → Control and governance
25. BD-02, BD-03, BD-04, BD-12 → Channel work instructions
26. TMPL-01→11 → Templates and checklists
27. ROLE-01 → Commercial role charter
28. SYS-01, CTRL-01, CTRL-02 → Architecture and document control

### Conflict handling rule
- For the expanded full-lifecycle ERP, ERP-12→21 governs any area it explicitly defines.
- For older commercial-MVP implementation details that do not conflict, preserve ERP-01→06 and ERP-09 guidance.
- Do not invent content for ERP-07, ERP-08, ERP-10, or ERP-11 unless those actual docs are provided.

Spec documents live in `/docs/specs/`. Read them before building.

## Non-Negotiable Build Rules
- NEVER collapse Client, Contact, Project Signal, Pursuit, Estimate, Proposal, Award/Handoff, Project, Mobilization, Change Order, or Expansion Task into one generic record type.
- NEVER invent lifecycle stages, enums, approval gates, or role powers not defined in the governing specs.
- NEVER allow status jumps that skip required entry criteria.
- NEVER hard-delete business records. Soft-delete/archive only.
- NEVER create bi-directional sync with external systems in v1.
- NEVER replace SharePoint as file SOT. Store links + metadata only.
- NEVER let PM self-approve pricing or financial concessions.
- NEVER overwrite the original sold baseline. Change Orders preserve prior truth.
- NEVER reuse a Mobilization record for a return trip. Create a new Mobilization.
- NEVER build outside the currently authorized module scope in ERP-16/17 or explicit leadership instruction.

## Tech Stack (ACTUAL)
- Next.js 16 App Router, TypeScript strict
- Microsoft Entra (Azure AD) for authentication / SSO
- File-based JSON DB at `.data/workflow-db.json`
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
- Vitest for testing (current baseline included 543+ existing tests; target 600+ passing)

## Database Pattern
This app uses a file-based JSON store at `.data/workflow-db.json`.
All entity reads/writes go through the data access layer.
Do NOT import from `drizzle-orm`, `postgres`, or `@supabase/*`.
Follow the same JSON DB pattern used by existing records.
When the app migrates to SQL later, only the data access layer should need to change.

## Auth Pattern
This app uses Microsoft Entra (Azure AD) SSO via the existing M365 tenant.
The current user and their roles come from the Entra session.
Do NOT import from `@supabase/ssr` or `@supabase/supabase-js`.
Use the existing auth helper to get the current user context.

## Canonical Entity Model (from ERP-12)
These are the ONLY record types. Do not invent new ones.

### Commercial
1. Client — company-level relationship ownership
2. Contact — person-level relationship and influence mapping
3. Project Signal — pre-pursuit proof a real project exists
4. Pursuit — project-specific qualification through Estimate Ready
5. Estimate — internal pricing, scope, labor target, assumptions
6. Proposal — released commercial package and decision truth
7. Award/Handoff — accepted work intake through PM claim
8. Change Order — controlled commercial revision after award
9. Expansion Task — post-project growth and repeat-work discovery

### PM / Operations
10. Project — parent execution record after commercial handoff
11. Mobilization — one actual deployment/trip under a Project

### Bridge Rule (CRITICAL)
Accepted Proposal → Award/Handoff → PM Claim → Closed to Ops → Project
Project owns stage map, compliance, billing baseline, closeout, and review.
Mobilization owns one actual trip only. Return trips = new Mobilization.

## State Machines (from ERP-13)

### Client
Watchlist → Target Client → Developing Relationship → Active Client → Dormant → Archived

### Pursuit
Project Signal Received → Qualification Underway → Qualified Pursuit → Preconstruction Packet Open → Site Walk Scheduled → Site Walk Complete → Pursue/No-Bid Review → BLU Closeout Plan Sent → Estimate Ready | Hold | Dormant | No-Bid

### Estimate
Draft → In Build → QA Review → Approved for Proposal → Superseded

### Proposal
Delivered → In Review → Hold → Accepted → Rejected → Dormant

### Award/Handoff
Awarded-Intake Open → Compliance in Progress → Handoff Posted → PM Claimed → Closed to Ops

### Project
Startup Pending → Forecasting Active → Execution Active → Operationally Complete → Financially Open → Financially Closed → Dispute/Hold

### Mobilization
Handoff Incomplete → Needs Planning → Blocked → Ready → In Field → Complete → Cancelled

### Change Order
Draft → Internal Review → Client Pending → Approved → Rejected → Released → Closed

### Expansion Task
Open → In Progress → Waiting → Complete → Cancelled

## State Machine Pattern
Every entity with a lifecycle gets a state machine file.
These are PURE LOGIC — no DB dependency.

For each transition define:
- `fromStates[]`
- `toState`
- `requiredFields[]`
- `requiredRoles[]`
- `sideEffects[]`
- `blockers[]`

Rules:
- Validate transitions server-side before any DB write.
- Blocked transitions must return an explicit error with the reason and required next action.
- Log every transition with full audit context.

## Permissions (from ERP-14)
8 roles with record-level, field-level, and approval-level control:
- Leadership / System Admin — all records, all approvals
- Commercial / BD — clients, contacts, signals, pursuits, proposals, expansion
- Estimating — estimates, proposal pricing, CO pricing
- PM / Ops — award/handoff ops, projects, mobilizations, reports, QC
- Team Lead — field forms, sign-offs, assigned mobilizations
- Technician — time, notes, assigned tasks (Jobber-facing)
- Admin / Finance — invoices, payments, reimbursements, vendor docs
- Read-only Stakeholder — dashboards and summaries only

Key restrictions:
- PM cannot self-approve pricing or financial concessions.
- Pricing fields are editable only by Estimating / authorized Commercial roles.
- Archive/reactivation requires System Admin or Leadership.
- Dashboard drill-down respects the same permission model as workspace access.
- Permission checks should remain pure-logic and centralized in `src/lib/permissions/`.

## Integrations (from ERP-15 + live environment notes)
- SharePoint: canonical document repository. ERP stores links + metadata only. Live via Graph API for document storage and folder creation.
- Teams: internal communication. ERP generates posts from events. Architecture still evolving; use stub notifications where required.
- Jobber: technician-facing execution. ERP creates/syncs jobs. Local-only / hosted instance currently disconnected in the noted environment.
- QuickBooks: accounting truth / health-check integration. ERP controls invoice-release state; QuickBooks is not the primary KPI source.
- Gusto: payroll/HR truth. ERP stores reimbursement approval only / payroll context only.
- Outlook: email transmission and send facts. Graph/API access may require device re-auth in the noted environment.
- GHL: live commercial context exists, including large synced contact/opportunity volume. External IDs should be stored as indexed reference fields.

Failure rule: every sync failure must be recoverable by same-day manual override recorded in ERP. Never create duplicate live records.

## Architecture Patterns
- All entities use UUID primary keys + human-readable reference IDs.
- Every create/update/delete logs: actor, timestamp, entity_id, field_changes, and reason where applicable.
- Enum values come from the governing ERP enum anchors as TypeScript unions.
- State transitions are validated server-side per the governing matrix.
- Blocked transitions return explicit error with reason and required action.
- External system IDs are stored as indexed reference fields (for example `ghl_company_id`).

## Entity Build Pattern (follow for every entity)
1. TypeScript interface in `src/types/commercial.ts`
2. Enum/status union types alongside the interface
3. State machine in `src/lib/state-machines/{entity}.ts`
4. Data access functions in `src/lib/db/{entity}.ts` or the established data layer path
5. Server actions in `src/actions/{entity}/index.ts`
6. Validation with Zod schemas in `src/lib/validations/{entity}.ts`
7. UI components in `src/components/{entity}/`
8. Page routes in `src/app/(dashboard)/{entity}/`
9. Tests in `src/tests/{entity}/`

## UI Patterns (from ERP-16 + ERP-20, preserving valid legacy ERP-09 guidance)
- Use TanStack Table for all list views (sortable, filterable).
- Use React Hook Form + Zod for all forms.
- Use Recharts for dashboards and KPI visualizations.
- Every entity workspace follows: header → state ribbon → action bar → tabbed content → right-rail cards → activity timeline.
- One record = one workspace page.
- Breadcrumbs always show parent context; when applicable use `Module > Parent Entity > Current Record`.
- State ribbon shows: current state, next action, blockers.
- Blocked transitions show WHY blocked and WHAT to do next.
- Quick-create should support the relevant active record types.
- Primary list views should load in ~2 seconds.
- Mobile/tablet usability is required for PM and field views.

## Navigation (from ERP-16)
Commercial tabs:
- Home
- Clients
- Contacts
- Pursuits
- Commercial
- Handoffs
- Change Orders
- Growth
- Approvals
- Reports
- Admin

PM tab:
- Projects (added when PM workflow is activated)

Cross-functional command surface:
- Queues
- Dashboards

## Testing Rules (from ERP-18 + legacy implementation guidance)
- Write tests before implementation when possible.
- Every state transition must have a test.
- Every blocked transition must have a test.
- Every permission boundary must have a test.
- UAT must prove the workflow works without hidden email, memory, or spreadsheet dependencies.
- Use realistic BLU-style data with client-specific stage names.
- Use seeded sample records from the governing UAT pack as fixtures where available.
- Run tests after every file change.
- Target: 600+ tests all passing.

## KPI Definitions (from ERP-21)
- Signal-to-pursuit conversion
- Estimate Ready cycle time
- Proposal aging by bucket
- Accepted jobs awaiting PM claim
- Readiness pass rate
- Callback rate
- Next-action hygiene
- Invoice release speed
- AR aging by client/project
- PM-15 review closure rate

## Commit Convention
- `feat({entity}): {description}` — new features
- `fix({entity}): {description}` — bug fixes
- `test({entity}): {description}` — test additions
- `docs: {description}` — documentation updates

## When Uncertain
1. Check the spec docs in `/docs/specs/` before guessing.
2. If specs are silent, ask — do not invent.
3. If two specs conflict, ERP-12→21 wins, then CORE/PM/admin SOPs, then legacy commercial docs.
4. Log any ambiguity in `/docs/decisions/` as a decision record.
