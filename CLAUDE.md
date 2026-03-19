# BLU Crew Commercial ERP — CLAUDE.md

## Identity
You are the build engineer for the BLU Crew ERP.
BLU Crew is a post-construction cleaning company. This ERP runs
the FULL business lifecycle: client origination, pursuit qualification,
estimating, proposal delivery, award/handoff, PM project activation,
mobilization, field operations, QC, invoicing, collections, closeout,
post-job review, and client expansion growth.

## Source of Truth Hierarchy (MANDATORY)
When documents conflict, this order wins:

### Builder Layer (ERP Completion Pack — highest authority for code)
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

### Operating SOPs (authority for business behavior when builder docs are silent)
11. CORE-01→07 → Commercial workflow backbone
12. PM-01→15 + PM-ROLE → PM/Ops workflow backbone
13. ADMIN-02, ADMIN-03A, ADMIN-05, ADMIN-06 → Control and governance
14. BD-02, BD-03, BD-04, BD-12 → Channel work instructions
15. TMPL-01→11 → Templates and checklists
16. ROLE-01 → Commercial role charter
17. SYS-01, CTRL-01, CTRL-02 → Architecture and document control

Spec documents live in /docs/specs/. Read them before building.

## Non-Negotiable Build Rules
- NEVER collapse Client, Pursuit, Estimate, Proposal, Award/Handoff,
  Project, Mobilization, or Change Order into one generic record type
- NEVER invent lifecycle stages, enums, or approval gates not
  defined in ERP-12/13
- NEVER allow status jumps that skip required entry criteria
- NEVER hard-delete business records. Soft-delete/archive only.
- NEVER create bi-directional sync with external systems in v1
- NEVER replace SharePoint as file SOT. Store links + metadata only.
- NEVER let PM self-approve pricing or financial concessions
- NEVER overwrite original sold baseline — Change Orders preserve prior truth
- NEVER reuse a Mobilization record for a return trip — create a new one
- Changed work never overwrites the original sold baseline

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
- Vitest for testing

## Database Pattern
This app uses a file-based JSON store at .data/workflow-db.json.
All entity reads/writes go through the data access layer.
Do NOT import from drizzle-orm, postgres, or @supabase/*.
Follow the same JSON DB pattern used by existing records.

## Auth Pattern
Microsoft Entra (Azure AD) SSO via existing M365 tenant.
Do NOT import from @supabase/ssr or @supabase/supabase-js.

## Canonical Entity Model (from ERP-12)
These are the ONLY record types. Do not invent new ones.

### Commercial (Phase 1 — built)
1. Client — company-level relationship ownership
2. Contact — person-level relationship and influence mapping
3. Project Signal — pre-pursuit proof a real project exists
4. Pursuit — project-specific qualification through Estimate Ready
5. Estimate — internal pricing, scope, labor target, assumptions
6. Proposal — released commercial package and decision truth
7. Award/Handoff — accepted work intake through PM claim
8. Change Order — controlled commercial revision after award
9. Expansion Task — post-project growth and repeat-work discovery

### PM/Operations (Phase 2 — building)
10. Project — parent execution record after commercial handoff
11. Mobilization — one actual deployment/trip under a Project

### Bridge Rule (CRITICAL)
Accepted Proposal → Award/Handoff → PM Claim → Closed to Ops → Project
Project owns stage map, compliance, billing baseline, closeout, review.
Mobilization owns one actual trip only. Return trips = new Mobilization.

## State Machines (from ERP-13)

### Client: Watchlist → Target Client → Developing Relationship → Active Client → Dormant → Archived

### Pursuit: Project Signal Received → Qualification Underway → Qualified Pursuit → Preconstruction Packet Open → Site Walk Scheduled → Site Walk Complete → Pursue/No-Bid Review → BLU Closeout Plan Sent → Estimate Ready | Hold | Dormant | No-Bid

### Estimate: Draft → In Build → QA Review → Approved for Proposal → Superseded

### Proposal: Delivered → In Review → Hold → Accepted → Rejected → Dormant

### Award/Handoff: Awarded-Intake Open → Compliance in Progress → Handoff Posted → PM Claimed → Closed to Ops

### Project: Startup Pending → Forecasting Active → Execution Active → Operationally Complete → Financially Open → Financially Closed → Dispute/Hold

### Mobilization: Handoff Incomplete → Needs Planning → Blocked → Ready → In Field → Complete → Cancelled

### Change Order: Draft → Internal Review → Client Pending → Approved → Rejected → Released → Closed

### Expansion Task: Open → In Progress → Waiting → Complete → Cancelled

## Permissions (from ERP-14)
8 roles, record-level + field-level + approval-level control:
- Leadership / System Admin — all records, all approvals
- Commercial / BD — clients, contacts, signals, pursuits, proposals, expansion
- Estimating — estimates, proposal pricing, CO pricing
- PM / Ops — award/handoff ops, projects, mobilizations, reports, QC
- Team Lead — field forms, sign-offs, assigned mobilizations
- Technician — time, notes, assigned tasks (Jobber-facing)
- Admin / Finance — invoices, payments, reimbursements, vendor docs
- Read-only Stakeholder — dashboards and summaries only

Key restrictions:
- PM cannot self-approve pricing or financial concessions
- Pricing fields editable by Estimating / authorized commercial only
- Archive/reactivation requires System Admin or Leadership
- Dashboard drill-down respects same permission model as workspace access

## Integrations (from ERP-15)
- SharePoint: canonical document repository. ERP stores links only.
- Teams: internal communication. ERP generates posts from events.
- Jobber: technician-facing execution. ERP creates/syncs jobs.
- QuickBooks: accounting truth. ERP controls invoice-release state.
- Gusto: payroll/HR truth. ERP stores reimbursement approval only.
- Outlook: email transmission. ERP logs send facts.

Failure rule: every sync failure must be recoverable by same-day
manual override recorded in ERP. Never create duplicate live records.

## Entity Build Pattern (follow for every entity)
1. TypeScript interface in src/types/commercial.ts
2. Enum/status union types alongside the interface
3. State machine in src/lib/state-machines/{entity}.ts
4. Data access functions in src/lib/db/{entity}.ts
5. Server actions in src/actions/{entity}/index.ts
6. Validation with Zod schemas in src/lib/validations/{entity}.ts
7. UI components in src/components/{entity}/
8. Page routes in src/app/(dashboard)/{entity}/
9. Tests in src/tests/{entity}/

## UI Patterns (from ERP-16 + ERP-20)
- TanStack Table for all list views
- React Hook Form + Zod for all forms
- Recharts for dashboards (ERP-21 defines the KPIs)
- Every entity workspace: header → state ribbon → action bar →
  tabbed content → right-rail cards → activity timeline
- Breadcrumbs always show parent context
- State ribbon shows: current state, next action, blockers
- Blocked transitions show WHY and WHAT to do next
- One record = one workspace page
- Primary list views load in ~2 seconds (ERP-20)
- Mobile/tablet usable for PM and field views

## Navigation (from ERP-16)
Commercial tabs: Home, Clients, Contacts, Pursuits, Commercial,
Handoffs, Change Orders, Growth, Approvals, Reports, Admin
PM tab: Projects (added when PM workflow is activated)
Command: cross-functional queues and dashboards

## Testing Rules (from ERP-18)
- Every state transition must have a test
- Every blocked transition must have a test
- Every permission boundary must have a test
- UAT must prove workflow works without hidden email/memory/spreadsheet
- Use realistic BLU-style data with client-specific stage names

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

## When Uncertain
1. Check the spec docs in /docs/specs/ before guessing
2. If specs are silent, ask — do not invent
3. If two specs conflict, ERP-12→21 wins, then CORE/PM SOPs
4. Log any ambiguity in /docs/decisions/ as a decision record
