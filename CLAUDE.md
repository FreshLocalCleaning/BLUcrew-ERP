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

### Legacy Builder Docs (superseded by ERP-12→21 where they overlap)
11. ERP-01 → Scope, module map, phasing (original)
12. ERP-02 → Canonical entities, fields, enums (original — ERP-12 supersedes)
13. ERP-03 → State transitions, approvals (original — ERP-13 supersedes)
14. ERP-04 → Roles and permissions (original — ERP-14 supersedes)
15. ERP-05 → Integration contracts (original — ERP-15 supersedes)
16. ERP-06 → UAT scenarios (original — ERP-18 supersedes)
17. ERP-07 → Build handoff rules and reading order
18. ERP-08 → Product backlog with epics and user stories
19. ERP-09 → Screen map, navigation, UX flow (ERP-16 extends)
20. ERP-10 → Data migration and cutover (ERP-19 supersedes)
21. ERP-11 → Sprint plan and dev order

### Operating SOPs (authority for business behavior when builder docs are silent)
22. CORE-01→07 → Commercial workflow backbone
23. PM-01→15 + PM-ROLE → PM/Ops workflow backbone
24. ADMIN-02, ADMIN-03A, ADMIN-05, ADMIN-06 → Control and governance
25. BD-02, BD-03, BD-04, BD-12 → Channel work instructions
26. TMPL-01→11 → Templates and checklists
27. ROLE-01 → Commercial role charter
28. SYS-01, CTRL-01, CTRL-02 → Architecture and document control

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
- NEVER build outside Phase 1 scope unless explicitly told
- NEVER let convenience override auditability
- NEVER let a coding shortcut bypass a documented approval gate

## TECH STACK (PRODUCTION — DO NOT DEVIATE)
- Next.js 16 App Router / TypeScript strict / React Server Components
- Azure App Service for hosting
- Microsoft Entra SSO for authentication (NOT Supabase Auth)
- File-based JSON database at `.data/workflow-db.json` (NOT Supabase/PostgreSQL)
- Zustand for client state management
- React Hook Form + Zod for form handling and runtime validation
- TanStack Table for all list/table views
- Recharts for dashboards and data visualization
- GitHub Actions for CI/CD (repo: FreshLocalCleaning/blucrew-erp)
- Sentry for error tracking
- shadcn/ui + Tailwind CSS for UI components

### External Systems (live in production)
- GoHighLevel (GHL): Primary CRM — 72k contacts, 41k opportunities. READ-ONLY sync.
- SharePoint: Document source of truth via Microsoft Graph API. ERP stores links only.
- OpenClaw: AI operator with live GHL integration and SharePoint via Graph API.
- Teams: Internal communication. ERP generates posts from events.
- Jobber: Technician-facing execution. ERP creates/syncs jobs.
- QuickBooks: Accounting truth. ERP controls invoice-release state.
- Gusto: Payroll/HR truth. ERP stores reimbursement approval only.
- Outlook: Email transmission. ERP logs send facts.

### Integration Failure Rule
Every sync failure must be recoverable by same-day manual override
recorded in ERP. Never create duplicate live records.

## CANONICAL ENTITIES (from ERP-12)

### Commercial Pipeline Entities
1. **Client** — Company-level relationship record
   - States: watchlist, target_client, developing_relationship, active_client, dormant, archived
   - Preferred-Provider Candidate is a tag on Active Client, not a separate state
2. **Contact** — Person at a client company
   - Five CORE-01 contact layers, BLU Champion designation, influence levels
   - Source channel tracking matching BD-02/03/04/12 work instructions
   - Structured touch log table
3. **Project Signal** — First-class record between Contact and Pursuit
   - Must pass a gate before opening a Pursuit
4. **Pursuit** — Project-specific qualification + preconstruction pipeline
   - States: project_signal_received, qualification_underway, qualified_pursuit,
     preconstruction_packet_open, site_walk_scheduled, site_walk_complete,
     pursue_no_bid_review, blu_closeout_plan_sent, estimate_ready,
     hold, dormant, no_bid
5. **Site Walk Event** — Child record on Pursuit
6. **Closeout Plan** — Artifact on Pursuit (requires approval gate, reason on return-to-scope)
7. **Estimate** — Priced scope from estimate-ready pursuit
   - States: draft, in_build, qa_review, approved_for_proposal, superseded
   - Pricing model: 26 build types, 4-stage pricing with configurable weights,
     BLU3 rate anchors per SF band, surcharges, mobilization,
     exterior/window/per diem add-ons, CLEAN methodology
   - References FLC Estimator at estimator.cleantheuniverse.com
8. **Proposal** — Client-facing commercial offer
   - States: delivered, in_review, hold, accepted, rejected, dormant
   - No internal draft/QA on Proposal — that lives on Estimate
9. **Decision Record** — Won/lost/hold outcome on proposal
10. **Award** — Converted win with compliance + handoff
    - States: awarded_intake_open, compliance_in_progress, handoff_posted,
      pm_claimed, closed_to_ops
    - closed_to_ops creates the parent Project record
11. **Compliance Packet** — Required documents for awards
12. **Handoff Package** — Sales-to-ops transition record

### Operations/PM Entities (from ERP-12/16)
13. **Project** — Parent record created when Award reaches closed_to_ops
    - States: startup_pending, forecasting_active, execution_active,
      operationally_complete, financially_open, financially_closed, dispute_hold
    - One project can have many mobilizations (trips)
14. **Mobilization** — Child record under Project (individual trip/deployment)
    - States: handoff_incomplete, needs_planning, blocked, ready,
      in_field, complete, cancelled

### Cross-Cutting Entities
15. **Change Order** — Post-award scope revision
    - States: draft, internal_review, client_pending, approved, rejected, released, closed
    - PM creates fact packet; BD/Estimating prices; PM never self-approves price
16. **Expansion Opportunity** — Post-project growth tracking
    - States: open, in_progress, waiting, complete, cancelled
    - Future work becomes a new Project Signal, not a reused Project

## ROLES AND PERMISSIONS (from ERP-14)

### Roles
1. Leadership / System Admin
2. Commercial / BD
3. Estimating
4. PM / Ops
5. Team Lead
6. Technician
7. Admin / Finance
8. Read-only Stakeholder

### Permission Types
V=View, C=Create, Eo=Edit Own, Ea=Edit Any, So=Status Own,
Sa=Status Any, Ap=Approve, Ov=Override, Ar=Archive, Ad=Admin

### Key Permission Rules
- Antonio = Leadership + Commercial/BD + Estimating (additive multi-role)
- Cullen = Leadership + PM/Ops
- Ownership scoping: edit_owned vs edit_any distinction enforced
- Every entity × role intersection must be explicitly defined
- Blocked transitions show WHY and WHAT to do next

## DB SCHEMA PATTERN (JSON DB)

### Global System Fields (from ERP-12)
Every record must include these fields:
- record_id: Unique immutable identifier (UUID)
- owner: Current accountable owner for the active record
- backup_owner: Secondary owner where continuity matters
- next_action: Human-readable next move
- next_action_date: Due date for the next move; required on all active records
- status: Primary lifecycle/state value from the approved dictionary
- stage_or_substatus: Optional controlled secondary indicator where required
- created_at / created_by: System-created audit fields
- updated_at / updated_by: System-created audit fields
- exception_flag: True when work is moving under an approved exception or override
- archive_state: Active, Archived, or Reactivated under approved rules
- file_link: Canonical SharePoint link or approved file-path reference
- audit_history: Required visible trail for state changes, overrides, and approvals

### File Location
`.data/workflow-db.json` — single file, read/write via helper functions.

### Record Shape
```typescript
interface BaseRecord {
  id: string;           // UUID
  refId: string;        // Human-readable: CLI-0001, PUR-0001, EST-0001, etc.
  status: string;       // Current lifecycle state
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
  createdBy: string;    // Entra user ID
  updatedBy: string;    // Entra user ID
}
```

### Collections
Each entity type is a top-level key in the JSON file:
```json
{
  "clients": [...],
  "contacts": [...],
  "projectSignals": [...],
  "pursuits": [...],
  "siteWalkEvents": [...],
  "closeoutPlans": [...],
  "estimates": [...],
  "proposals": [...],
  "decisionRecords": [...],
  "awards": [...],
  "compliancePackets": [...],
  "handoffPackages": [...],
  "projects": [...],
  "mobilizations": [...],
  "changeOrders": [...],
  "expansionOpportunities": [...],
  "auditLog": [...]
}
```

### Data Access Pattern
```typescript
// src/lib/db/{entity}.ts
import { readDb, writeDb } from './engine';

export function getAll{Entity}s() { ... }
export function get{Entity}ById(id: string) { ... }
export function create{Entity}(data: Create{Entity}Input) { ... }
export function update{Entity}(id: string, data: Partial<{Entity}>) { ... }
```

### Auth Pattern
```typescript
// Use Entra session helpers, NOT Supabase auth
import { getServerSession } from 'next-auth';
import { entraConfig } from '@/lib/auth/entra';

const session = await getServerSession(entraConfig);
const userId = session?.user?.id;
const userRoles = session?.user?.roles; // From Entra group membership
```

## Entity Build Pattern (follow for EVERY entity)
1. TypeScript interface in `src/types/commercial.ts`
2. Enum/status union types alongside the interface
3. State machine in `src/lib/state-machines/{entity}.ts`
4. Data access functions in `src/lib/db/{entity}.ts` (JSON DB reads/writes)
5. Server actions in `src/actions/{entity}/index.ts`
6. Validation with Zod schemas in `src/lib/validations/{entity}.ts`
7. UI components in `src/components/{entity}/`
8. Page routes in `src/app/(dashboard)/{entity}/`
9. Tests in `src/tests/{entity}/`

## STATE MACHINE PATTERN
```typescript
// src/lib/state-machines/engine.ts
interface Transition<S extends string> {
  from: S[];
  to: S;
  requiredRoles: string[];
  requiredFields?: string[];
  requiresReason?: boolean;
  entryCriteria?: string[];
  blockers?: string[];
  sideEffects?: { type: string; description: string }[];
}

interface StateMachineDefinition<S extends string> {
  entityType: string;
  terminalStates: S[];
  reopenableStates?: S[];
  reopenRoles?: string[];
  transitions: Transition<S>[];
}
```
- Pure TypeScript logic, no DB dependency
- Every transition validated server-side BEFORE any DB write
- Blocked transitions return explicit error with reason + required action
- No active record advances with missing owner, next_action, and next_action_date
  unless the move is a controlled downstream automation
- Any override writes approver, reason, date, and linked evidence into audit trail
- Changed work never overwrites the original sold baseline

## UI PATTERNS (from ERP-16 + ERP-20)
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

## NAVIGATION (from ERP-16)
Commercial tabs: Home, Clients, Contacts, Pursuits, Commercial,
Handoffs, Change Orders, Growth, Approvals, Reports, Admin
PM tab: Projects (added when PM workflow is activated)
Command: cross-functional queues and dashboards

## TESTING RULES (from ERP-18)
- Every state transition must have a test
- Every blocked transition must have a test
- Every permission boundary must have a test
- UAT must prove workflow works without hidden email/memory/spreadsheet
- Use realistic BLU-style data with client-specific stage names
- Test framework: Vitest

## BUILD ORDER
S0: Auth, environment, entity shells, audit/event model, base enums ✅
S1: Client + Contact core (CRUD, permissions, lifecycle, views) ✅
S2: Pursuit core (signal→estimate-ready, site walk, closeout plan) ✅
S3: Estimate + Proposal (pricing, decisions, loss capture)
S4: Award + Compliance + Handoff (packet tracking, bridge to build)
S5: Project + Mobilization (PM activation, trip management)
S6: Change Order + Expansion (CO approvals, growth tasks)
S7: Integrations + Dashboards (GHL/Jobber sync, reporting, KPIs from ERP-21)
S8: UAT + Cutover (ERP-18 scenarios, migration rehearsal per ERP-19)

## KPI DEFINITIONS (from ERP-21)
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

## COMMIT CONVENTIONS
- One logical change per commit
- Format: `feat(entity): description` or `fix(entity): description`
- Run all tests before pushing
- Push to feature branch, merge to main after verification

## WHEN UNCERTAIN
1. Check the spec docs in /docs/specs/ before guessing
2. If specs are silent, ask — do not invent
3. If two specs conflict, ERP-12→21 wins, then CORE/PM SOPs
4. Log any ambiguity in /docs/decisions/ as a decision record
