/**
 * Commercial ERP — Entity Type Definitions
 *
 * Canonical interfaces for all entities.
 * Enums come from ERP-02 Key Enum Anchors.
 */

import type { BaseEntity } from '@/lib/db/json-db'
import type { ClientState } from '@/lib/state-machines/client'
import type { ProjectSignalState } from '@/lib/state-machines/project-signal'
import type { PursuitStage } from '@/lib/state-machines/pursuit'
import type { EstimateStatus } from '@/lib/state-machines/estimate'
import type { ProposalStatus } from '@/lib/state-machines/proposal'
import type { AwardHandoffState } from '@/lib/state-machines/award-handoff'
import type { ProjectState } from '@/lib/state-machines/project'
import type { MobilizationState } from '@/lib/state-machines/mobilization'
import type { ChangeOrderState } from '@/lib/state-machines/change-order'
import type { ExpansionTaskState } from '@/lib/state-machines/expansion-task'

// ---------------------------------------------------------------------------
// Client enums
// ---------------------------------------------------------------------------

export const CLIENT_TIERS = ['A', 'B', 'C'] as const
export type ClientTier = (typeof CLIENT_TIERS)[number]

export const CLIENT_TIER_LABELS: Record<ClientTier, string> = {
  A: 'Tier A',
  B: 'Tier B',
  C: 'Tier C',
}

export const CLIENT_VERTICALS = [
  'general_contractor',
  'owner_developer',
  'gym_fitness',
  'data_center',
  'hospitality',
  'medical',
  'retail',
  'office',
  'restaurant',
  'industrial',
  'education',
  'multifamily',
  'other',
] as const
export type ClientVertical = (typeof CLIENT_VERTICALS)[number]

export const CLIENT_VERTICAL_LABELS: Record<ClientVertical, string> = {
  general_contractor: 'General Contractor',
  owner_developer: 'Owner/Developer',
  gym_fitness: 'Gym/Fitness',
  data_center: 'Data Center',
  hospitality: 'Hospitality',
  medical: 'Medical',
  retail: 'Retail',
  office: 'Office',
  restaurant: 'Restaurant',
  industrial: 'Industrial',
  education: 'Education',
  multifamily: 'Multifamily',
  other: 'Other',
}

export const CLIENT_MARKETS = [
  'dallas_fort_worth',
  'north_texas',
  'austin',
  'houston',
  'san_antonio',
  'other_texas',
  'oklahoma',
  'out_of_state',
] as const
export type ClientMarket = (typeof CLIENT_MARKETS)[number]

export const CLIENT_MARKET_LABELS: Record<ClientMarket, string> = {
  dallas_fort_worth: 'Dallas-Fort Worth',
  north_texas: 'North Texas',
  austin: 'Austin',
  houston: 'Houston',
  san_antonio: 'San Antonio',
  other_texas: 'Other Texas',
  oklahoma: 'Oklahoma',
  out_of_state: 'Out of State',
}

export const CLIENT_RELATIONSHIP_STRENGTHS = [
  'cold',
  'developing',
  'active',
  'trusted',
] as const
export type ClientRelationshipStrength = (typeof CLIENT_RELATIONSHIP_STRENGTHS)[number]

export const CLIENT_RELATIONSHIP_LABELS: Record<ClientRelationshipStrength, string> = {
  cold: 'Cold',
  developing: 'Developing',
  active: 'Active',
  trusted: 'Trusted',
}

// ---------------------------------------------------------------------------
// Client interface
// ---------------------------------------------------------------------------

export interface Client extends BaseEntity {
  /** Human-readable reference ID: CLT-XXXX */
  reference_id: string
  /** Company name */
  name: string
  /** Doing business as */
  dba?: string
  /** Client tier: A, B, or C */
  tier?: ClientTier
  /** Primary vertical / industry */
  vertical?: ClientVertical
  /** Market / geography */
  market?: ClientMarket
  /** Relationship strength */
  relationship_strength?: ClientRelationshipStrength
  /** Current lifecycle state */
  status: ClientState
  /** Preferred-Provider Candidate tag (ERP-13: tag on Active Client, not a state) */
  preferred_provider_candidate: boolean
  /** General notes */
  notes?: string
  /** BD owner user ID */
  bd_owner_id?: string
  /** BD owner display name (denormalized for list views) */
  bd_owner_name?: string
  /** GHL company ID for integration */
  ghl_company_id?: string
  /** Won award ID (for state machine transitions) */
  won_award_id?: string
  /** Contact IDs associated with this client */
  contacts: string[]
}

// ---------------------------------------------------------------------------
// Contact enums (CORE-01 Relationship Mapping)
// ---------------------------------------------------------------------------

export const CONTACT_LAYERS = [
  'pm_super_field',
  'estimator_precon',
  'exec_owner_rep',
  'coordinator_admin',
  'blu_champion',
] as const
export type ContactLayer = (typeof CONTACT_LAYERS)[number]

export const CONTACT_LAYER_LABELS: Record<ContactLayer, string> = {
  pm_super_field: 'PM/Super/Field Lead',
  estimator_precon: 'Estimator/Precon',
  exec_owner_rep: 'Exec/Owner Rep',
  coordinator_admin: 'Coordinator/Admin',
  blu_champion: 'BLU Champion',
}

export const CONTACT_INFLUENCE_LEVELS = ['high', 'medium', 'low'] as const
export type ContactInfluence = (typeof CONTACT_INFLUENCE_LEVELS)[number]

export const CONTACT_INFLUENCE_LABELS: Record<ContactInfluence, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const CONTACT_RELATIONSHIP_STRENGTHS = [
  'new',
  'developing',
  'active',
  'trusted',
  'dormant',
] as const
export type ContactRelationshipStrength = (typeof CONTACT_RELATIONSHIP_STRENGTHS)[number]

export const CONTACT_RELATIONSHIP_LABELS: Record<ContactRelationshipStrength, string> = {
  new: 'New',
  developing: 'Developing',
  active: 'Active',
  trusted: 'Trusted',
  dormant: 'Dormant',
}

export const CONTACT_SOURCE_CHANNELS = [
  'trailer_visit',
  'cold_outreach',
  'event',
  'luncheon',
  'referral',
  'repeat_client',
  'inbound',
  'project_handoff',
] as const
export type ContactSourceChannel = (typeof CONTACT_SOURCE_CHANNELS)[number]

export const CONTACT_SOURCE_LABELS: Record<ContactSourceChannel, string> = {
  trailer_visit: 'Trailer Visit',
  cold_outreach: 'Cold Outreach',
  event: 'Event',
  luncheon: 'Luncheon',
  referral: 'Referral',
  repeat_client: 'Repeat Client',
  inbound: 'Inbound',
  project_handoff: 'Project Handoff',
}

export const CONTACT_PREFERRED_CHANNELS = [
  'email',
  'phone',
  'text',
  'linkedin',
  'in_person',
] as const
export type ContactPreferredChannel = (typeof CONTACT_PREFERRED_CHANNELS)[number]

export const CONTACT_PREFERRED_CHANNEL_LABELS: Record<ContactPreferredChannel, string> = {
  email: 'Email',
  phone: 'Phone',
  text: 'Text',
  linkedin: 'LinkedIn',
  in_person: 'In Person',
}

// ---------------------------------------------------------------------------
// Contact interface
// ---------------------------------------------------------------------------

export interface Contact extends BaseEntity {
  /** Human-readable reference ID: CON-XXXX */
  reference_id: string
  /** First name */
  first_name: string
  /** Last name */
  last_name: string
  /** Job title */
  title?: string
  /** Company name (denormalized for list views) */
  company?: string
  /** Client ID this contact belongs to */
  client_id: string
  /** Client name (denormalized for list views) */
  client_name: string
  /** Contact organizational layer */
  layer: ContactLayer
  /** Role type (free text, e.g. "Senior PM", "VP Operations") */
  role_type?: string
  /** Influence level */
  influence: ContactInfluence
  /** Is this person a BLU Champion? */
  is_champion: boolean
  /** Why this person is a champion */
  champion_reason?: string
  /** Email */
  email?: string
  /** Phone */
  phone?: string
  /** LinkedIn URL */
  linkedin_url?: string
  /** Preferred communication channel */
  preferred_channel?: ContactPreferredChannel
  /** Relationship strength */
  relationship_strength: ContactRelationshipStrength
  /** Source channel — how we met */
  source_channel?: ContactSourceChannel
  /** Project visibility notes */
  project_visibility_notes?: string
  /** Access path — how to reach them */
  access_path?: string
  /** Pain points */
  pain_points?: string
  /** General notes */
  notes?: string
  /** Next step text */
  next_step?: string
  /** Next step due date (ISO string) */
  next_step_due_date?: string
  /** Last touch date (ISO string) */
  last_touch_date?: string
  /** Touch count */
  touch_count: number
  /** BLU Crew relationship owner name (e.g. "Antonio", "Cullen") */
  owner_name?: string
}

// ---------------------------------------------------------------------------
// Project Signal enums (ERP-12/13 — first-class record between Contact and Pursuit)
// ---------------------------------------------------------------------------

export const PROJECT_SIGNAL_TYPES = [
  'plan_room',
  'direct_contact',
  'referral',
  'event_network',
  'repeat_client',
  'subcontractor_tip',
  'online_inquiry',
] as const
export type ProjectSignalType = (typeof PROJECT_SIGNAL_TYPES)[number]

export const PROJECT_SIGNAL_TYPE_LABELS: Record<ProjectSignalType, string> = {
  plan_room: 'Plan Room',
  direct_contact: 'Direct Contact',
  referral: 'Referral',
  event_network: 'Event / Network',
  repeat_client: 'Repeat Client',
  subcontractor_tip: 'Subcontractor Tip',
  online_inquiry: 'Online Inquiry',
}

export const PROJECT_SIGNAL_GATE_OUTCOMES = [
  'pending',
  'passed',
  'failed',
  'deferred',
] as const
export type ProjectSignalGateOutcome = (typeof PROJECT_SIGNAL_GATE_OUTCOMES)[number]

export const PROJECT_SIGNAL_GATE_LABELS: Record<ProjectSignalGateOutcome, string> = {
  pending: 'Pending',
  passed: 'Passed',
  failed: 'Failed',
  deferred: 'Deferred',
}

// ---------------------------------------------------------------------------
// Project Signal interface
// ---------------------------------------------------------------------------

export interface ProjectSignal extends BaseEntity {
  /** Human-readable reference ID: SIG-XXXX */
  reference_id: string
  /** Current lifecycle state */
  status: ProjectSignalState
  /** Signal type — how we heard about this opportunity */
  signal_type: ProjectSignalType
  /** Evidence or proof that the signal is real */
  source_evidence: string
  /** Linked client ID */
  linked_client_id: string
  /** Linked client name (denormalized for list views) */
  linked_client_name: string
  /** Linked contact ID */
  linked_contact_id?: string
  /** Linked contact name (denormalized) */
  linked_contact_name?: string
  /** Project name / description */
  project_identity: string
  /** Timing signal — schedule context */
  timing_signal: string | null
  /** Fit/risk note */
  fit_risk_note: string | null
  /** Gate outcome */
  gate_outcome: ProjectSignalGateOutcome
  /** Who made the gate decision */
  gate_decision_by: string | null
  /** When the gate decision was made (ISO string) */
  gate_decision_date: string | null
  /** Notes */
  notes?: string
  /** Pursuit ID created from this signal (set when gate passes) */
  created_pursuit_id?: string
}

// ---------------------------------------------------------------------------
// Pursuit enums (CORE-02 Project Pursuit Qualification)
// ---------------------------------------------------------------------------

export const PURSUIT_SIGNAL_TYPES = [
  'referral',
  'trailer',
  'outreach',
  'event',
  'repeat_client',
  'inbound',
] as const
export type PursuitSignalType = (typeof PURSUIT_SIGNAL_TYPES)[number]

export const PURSUIT_SIGNAL_LABELS: Record<PursuitSignalType, string> = {
  referral: 'Referral',
  trailer: 'Trailer',
  outreach: 'Outreach',
  event: 'Event',
  repeat_client: 'Repeat Client',
  inbound: 'Inbound',
}

export const PURSUIT_CLIENT_TYPES = ['gc', 'owner', 'other'] as const
export type PursuitClientType = (typeof PURSUIT_CLIENT_TYPES)[number]

export const PURSUIT_CLIENT_TYPE_LABELS: Record<PursuitClientType, string> = {
  gc: 'GC',
  owner: 'Owner',
  other: 'Other',
}

export const PURSUIT_BUILD_TYPES = [
  'gym_fitness',
  'data_center',
  'hospitality',
  'medical',
  'retail',
  'office',
  'restaurant',
  'industrial',
  'education',
  'multifamily',
  'other',
] as const
export type PursuitBuildType = (typeof PURSUIT_BUILD_TYPES)[number]

export const PURSUIT_BUILD_TYPE_LABELS: Record<PursuitBuildType, string> = {
  gym_fitness: 'Gym/Fitness',
  data_center: 'Data Center',
  hospitality: 'Hospitality',
  medical: 'Medical',
  retail: 'Retail',
  office: 'Office',
  restaurant: 'Restaurant',
  industrial: 'Industrial',
  education: 'Education',
  multifamily: 'Multifamily',
  other: 'Other',
}

// ---------------------------------------------------------------------------
// Pursuit interface
// ---------------------------------------------------------------------------

export interface Pursuit extends BaseEntity {
  /** Human-readable reference ID: PUR-XXXX */
  reference_id: string
  /** Linked Project Signal ID (required — Pursuit can only be created from a passed signal) */
  linked_signal_id: string
  /** Project name */
  project_name: string
  /** Client ID */
  client_id: string
  /** Client name (denormalized for list views) */
  client_name: string
  /** Primary contact ID */
  primary_contact_id?: string
  /** Primary contact name (denormalized) */
  primary_contact_name?: string
  /** How the signal came in */
  signal_type?: PursuitSignalType
  /** Client type for this pursuit */
  client_type?: PursuitClientType
  /** Build / project type */
  build_type?: PursuitBuildType
  /** Location / address */
  location?: string
  /** Approximate square footage */
  approx_sqft?: number
  /** Current pursuit stage */
  stage: PursuitStage
  /** Projected substantial completion date (ISO string) */
  projected_substantial_completion?: string
  /** Target owner walk date (ISO string) */
  target_owner_walk?: string
  /** Target opening date (ISO string) */
  target_opening?: string
  /** General notes */
  notes?: string
  /** BD owner user ID */
  bd_owner_id?: string
  /** BD owner display name (denormalized) */
  bd_owner_name?: string
  /** No-bid reason (if pursuit was no-bid) */
  no_bid_reason?: string
}

// ---------------------------------------------------------------------------
// Estimate enums (ERP-12/13 — Priced scope from estimate-ready pursuit)
// ---------------------------------------------------------------------------

export const ESTIMATE_TIER_LABELS = [
  '70%',
  '75%',
  'Floor',
  'BLU Standard',
  'Stretch',
  'Luxury',
] as const
export type EstimateTierLabel = (typeof ESTIMATE_TIER_LABELS)[number]

export const ESTIMATE_TIER_LABEL_MAP: Record<number, string> = {
  0: '70%',
  1: '75%',
  2: 'Floor',
  3: 'BLU Standard',
  4: 'Stretch',
  5: 'Luxury',
}

// ---------------------------------------------------------------------------
// Estimate interface (ERP-12 Table 3 R5, ERP-13 Table 11)
// ---------------------------------------------------------------------------

/** JSON shape for surcharge line items captured from the FLC Estimator. */
export interface EstimateSurcharge {
  name: string
  amount: number
  type: 'flat' | 'percentage'
}

/** JSON shape for mobilization cost data captured from the FLC Estimator. */
export interface EstimateMobilizationCost {
  distance_miles: number | null
  trips: number | null
  base_cost: number | null
  total: number | null
}

/** JSON shape for per-stage pricing breakdown captured from the FLC Estimator. */
export interface EstimateStagePricing {
  stage_name: string
  weight: number
  subtotal: number
}

/** JSON shape for the full pricing summary captured from the FLC Estimator. */
export interface EstimatePricingSummary {
  stage_breakdowns: EstimateStagePricing[]
  subtotal: number
  adjustments: number
  grand_total: number
}

export interface Estimate extends BaseEntity {
  /** Human-readable reference ID: EST-XXXX */
  reference_id: string
  /** Current lifecycle status */
  status: EstimateStatus
  /** Linked pursuit ID (required — must be at estimate_ready) */
  linked_pursuit_id: string
  /** Linked client ID (denormalized) */
  linked_client_id: string
  /** Linked client name (denormalized) */
  linked_client_name: string
  /** Linked pursuit name (denormalized) */
  linked_pursuit_name: string
  /** Project name */
  project_name: string
  /** Build type from estimator's 26 types */
  build_type: string | null
  /** Total square footage */
  square_footage: number | null
  /** Number of stages (1-4) */
  stage_count: number | null
  /** Which stages are selected */
  stage_selections: string[]
  /** Tier index (0-5 → 70%/75%/Floor/BLU Standard/Stretch/Luxury) */
  tier_index: number | null
  /** Base rate per SF */
  base_rate: number | null
  /** BLU3 rate per SF (if applicable) */
  blu3_rate: number | null
  /** Surcharges from estimator */
  surcharges: EstimateSurcharge[]
  /** Mobilization cost breakdown */
  mobilization_cost: EstimateMobilizationCost | null
  /** Exterior cleaning cost */
  exterior_cost: number | null
  /** Window cleaning cost */
  window_cost: number | null
  /** Per diem cost */
  per_diem_cost: number | null
  /** Labor target in hours */
  labor_target_hours: number | null
  /** Assumptions text */
  assumptions: string | null
  /** Exclusions text */
  exclusions: string | null
  /** AI-generated scope text from estimator */
  scope_text: string | null
  /** Full pricing summary from estimator output */
  pricing_summary: EstimatePricingSummary | null
  /** QA reviewer user ID */
  qa_reviewer_id: string | null
  /** QA reviewer name (denormalized) */
  qa_reviewer_name: string | null
  /** QA review notes */
  qa_notes: string | null
  /** Version number (starts at 1) */
  version: number
  /** If superseded, the ID of the new version */
  superseded_by_id: string | null
  /** Full estimator state snapshot for reload/edit */
  estimator_snapshot: Record<string, unknown> | null
}

// ---------------------------------------------------------------------------
// Proposal enums (ERP-13 Table 12)
// ---------------------------------------------------------------------------

export const PROPOSAL_ACCEPTANCE_METHODS = [
  'email',
  'verbal',
  'signed_document',
  'purchase_order',
] as const
export type ProposalAcceptanceMethod = (typeof PROPOSAL_ACCEPTANCE_METHODS)[number]

export const PROPOSAL_ACCEPTANCE_METHOD_LABELS: Record<ProposalAcceptanceMethod, string> = {
  email: 'Email',
  verbal: 'Verbal',
  signed_document: 'Signed Document',
  purchase_order: 'Purchase Order',
}

// ---------------------------------------------------------------------------
// Proposal interface (ERP-12 Table 3 R6, ERP-13 Table 12)
// ---------------------------------------------------------------------------

export interface Proposal extends BaseEntity {
  /** Human-readable reference ID: PRO-XXXX */
  reference_id: string
  /** Current lifecycle status */
  status: ProposalStatus
  /** Linked estimate ID (required — must be at approved_for_proposal) */
  linked_estimate_id: string
  /** Linked pursuit ID (denormalized) */
  linked_pursuit_id: string
  /** Linked client ID (denormalized) */
  linked_client_id: string
  /** Linked client name (denormalized) */
  linked_client_name: string
  /** Project name (denormalized) */
  project_name: string
  /** Proposal total value */
  proposal_value: number
  /** Version number */
  version: number
  /** Date proposal was delivered to client (ISO string) */
  delivery_date: string | null
  /** Target date for client decision (ISO string) */
  decision_target_date: string | null
  /** Reason for acceptance or rejection */
  accepted_rejected_reason: string | null
  /** How acceptance was confirmed */
  acceptance_confirmation_method: ProposalAcceptanceMethod | null
  /** Next decision cadence follow-up date (ISO string) */
  decision_cadence_next_date: string | null
  /** External-facing notes */
  external_notes: string | null
  /** Award/Handoff ID created from acceptance (set by side effect) */
  created_award_id: string | null
}

// ---------------------------------------------------------------------------
// Award/Handoff sub-types (ERP-12 Table 3 R8/R9, ERP-13)
// ---------------------------------------------------------------------------

/** A single compliance document in the compliance tracker */
export interface ComplianceDocItem {
  doc_name: string
  required: boolean
  status: 'pending' | 'received' | 'waived'
  received_date: string | null
  notes: string | null
}

/** A startup blocker tracked on an Award/Handoff */
export interface StartupBlockerItem {
  blocker: string
  owner: string
  status: 'open' | 'resolved'
  resolved_date: string | null
}

// ---------------------------------------------------------------------------
// Award/Handoff interface (ERP-12 Table 3 R8, ERP-13)
// ---------------------------------------------------------------------------

export interface AwardHandoff extends BaseEntity {
  /** Human-readable reference ID: AWD-XXXX */
  reference_id: string
  /** Current lifecycle state */
  status: AwardHandoffState
  /** Linked proposal ID (required — auto-created from accepted proposal) */
  linked_proposal_id: string
  /** Linked pursuit ID (denormalized) */
  linked_pursuit_id: string
  /** Linked estimate ID (denormalized) */
  linked_estimate_id: string
  /** Linked client ID (denormalized) */
  linked_client_id: string
  /** Project name (denormalized) */
  project_name: string
  /** Frozen copy of estimate pricing summary, scope, and assumptions at acceptance */
  accepted_baseline_snapshot: Record<string, unknown>
  /** Array of compliance document tracking items */
  compliance_tracker: ComplianceDocItem[]
  /** Array of startup blocker items */
  startup_blockers: StartupBlockerItem[]
  /** Teams handoff post URL */
  teams_handoff_post_url: string | null
  /** PM who claimed this handoff */
  pm_claim_user_id: string | null
  /** When the PM claimed this handoff (ISO string) */
  pm_claim_timestamp: string | null
  /** Project ID created when closed_to_ops (populated by side effect) */
  created_project_id: string | null
}

// ---------------------------------------------------------------------------
// Project interface (ERP-12 Table 3 R11, ERP-13, ERP-16)
// ---------------------------------------------------------------------------

export interface Project extends BaseEntity {
  /** Human-readable reference ID: PRJ-XXXX */
  reference_id: string
  /** Current lifecycle state */
  status: ProjectState
  /** Linked Award/Handoff ID (required — auto-created from closed_to_ops) */
  linked_award_handoff_id: string
  /** Linked client ID (denormalized) */
  linked_client_id: string
  /** Project name (denormalized) */
  project_name: string
  /** PM owner user ID */
  pm_owner_id: string
  /** Frozen commercial baseline snapshot (copied from award) */
  commercial_baseline_snapshot: Record<string, unknown>
  /** Client-facing stage names and forecast */
  client_stage_map: Record<string, unknown> | null
  /** Target turnover date (ISO string) */
  target_turnover_date: string | null
  /** Billing references */
  billing_references: Record<string, unknown> | null
  /** Number of active change orders */
  active_change_order_count: number
}

// ---------------------------------------------------------------------------
// Mobilization enums (ERP-12/13 — child record under Project)
// ---------------------------------------------------------------------------

export const MOBILIZATION_TRAVEL_POSTURES = ['local', 'overnight'] as const
export type MobilizationTravelPosture = (typeof MOBILIZATION_TRAVEL_POSTURES)[number]

export const MOBILIZATION_TRAVEL_POSTURE_LABELS: Record<MobilizationTravelPosture, string> = {
  local: 'Local',
  overnight: 'Overnight',
}

export const EQUIPMENT_STATUSES = ['packed', 'needed', 'rented', 'na'] as const
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number]

export const CLIENT_SIGNOFF_STATUSES = ['pending', 'obtained', 'disputed'] as const
export type ClientSignoffStatus = (typeof CLIENT_SIGNOFF_STATUSES)[number]

export const INVOICE_RELEASE_STATUSES = ['not_ready', 'staged', 'released'] as const
export type InvoiceReleaseStatus = (typeof INVOICE_RELEASE_STATUSES)[number]

// ---------------------------------------------------------------------------
// Mobilization sub-types
// ---------------------------------------------------------------------------

export interface LodgingDetails {
  hotel: string
  bed_count: number
  confirmation: string | null
  check_in: string
  check_out: string
}

export interface EquipmentChecklistItem {
  item: string
  status: EquipmentStatus
  notes: string | null
}

export interface ReadinessChecklist {
  crew_confirmed: boolean
  equipment_loaded: boolean
  travel_booked: boolean
  lodging_booked: boolean
  per_diem_approved: boolean
  jobber_synced: boolean
  teams_posted: boolean
}

export interface DailyReport {
  date: string
  summary: string
  photos: string[]
  exceptions: string | null
  submitted_by: string
}

export interface QcStageCompletion {
  passed: boolean
  reviewer_id: string
  date: string
  notes: string
}

// ---------------------------------------------------------------------------
// Mobilization interface (ERP-12 Table 3 R12, ERP-13, ERP-16)
// ---------------------------------------------------------------------------

export interface Mobilization extends BaseEntity {
  /** Human-readable reference ID: MOB-XXXX */
  reference_id: string
  /** Current lifecycle state */
  status: MobilizationState
  /** Linked project ID (required) */
  linked_project_id: string
  /** Linked client ID (denormalized) */
  linked_client_id: string
  /** Client-facing stage name from project's client_stage_map */
  stage_name: string
  /** Crew lead user ID */
  crew_lead_id: string | null
  /** Array of named technician user IDs */
  named_technicians: string[]
  /** Requested start date (ISO string) */
  requested_start_date: string | null
  /** Requested end date (ISO string) */
  requested_end_date: string | null
  /** Actual start date (ISO string) */
  actual_start_date: string | null
  /** Actual end date (ISO string) */
  actual_end_date: string | null
  /** Site address */
  site_address: string | null
  /** Access plan */
  access_plan: string | null
  /** Travel posture: local or overnight */
  travel_posture: MobilizationTravelPosture
  /** Lodging details (overnight only) */
  lodging_details: LodgingDetails | null
  /** Per diem budget */
  per_diem_budget: number | null
  /** Equipment checklist items */
  equipment_checklist: EquipmentChecklistItem[]
  /** Vehicle plan */
  vehicle_plan: string | null
  /** Readiness gate checklist */
  readiness_checklist: ReadinessChecklist
  /** Compressed planning flag per ERP-13 */
  compressed_planning: boolean
  /** Daily field reports */
  daily_reports: DailyReport[]
  /** SharePoint link to photo report */
  photo_report_link: string | null
  /** Client sign-off status */
  client_signoff_status: ClientSignoffStatus | null
  /** QC stage completion */
  qc_stage_completion: QcStageCompletion | null
  /** Invoice release status */
  invoice_release_status: InvoiceReleaseStatus | null
  /** Blocker reason (for blocked state) */
  blocker_reason: string | null
  /** Blocker owner (for blocked state) */
  blocker_owner: string | null
  /** Missing items log (for handoff_incomplete state) */
  missing_items_log: string[] | null
  /** Actuals notes */
  actuals_notes: string | null
}

// ---------------------------------------------------------------------------
// Change Order enums (ERP-12/13 — post-award scope revision)
// ---------------------------------------------------------------------------

export const CHANGE_ORDER_ORIGINS = [
  'pm_field_discovery',
  'client_request',
  'commercial_review',
  'scope_gap',
] as const
export type ChangeOrderOrigin = (typeof CHANGE_ORDER_ORIGINS)[number]

export const CHANGE_ORDER_ORIGIN_LABELS: Record<ChangeOrderOrigin, string> = {
  pm_field_discovery: 'PM Field Discovery',
  client_request: 'Client Request',
  commercial_review: 'Commercial Review',
  scope_gap: 'Scope Gap',
}

// ---------------------------------------------------------------------------
// Change Order sub-types
// ---------------------------------------------------------------------------

export interface PricingDelta {
  original_value: number
  revised_value: number
  delta: number
}

// ---------------------------------------------------------------------------
// Change Order interface (ERP-12 Table 3 R13, ERP-13)
// ---------------------------------------------------------------------------

export interface ChangeOrder extends BaseEntity {
  /** Human-readable reference ID: CO-XXXX */
  reference_id: string
  /** Current lifecycle state */
  status: ChangeOrderState
  /** Linked project ID (required) */
  linked_project_id: string
  /** Linked mobilization ID (optional — can attach to project or specific mobilization) */
  linked_mobilization_id: string | null
  /** Linked client ID (denormalized) */
  linked_client_id: string
  /** Who/what triggered the change order */
  origin: ChangeOrderOrigin
  /** Description of what changed */
  scope_delta: string
  /** Pricing delta JSON — original vs revised vs delta */
  pricing_delta: PricingDelta | null
  /** Impact on schedule */
  schedule_delta: string | null
  /** Impact on active/planned mobilizations */
  mobilization_impact: string | null
  /** PM who documented the facts */
  fact_packet_by: string
  /** BD/Estimating who priced it */
  priced_by: string | null
  /** Approval notes */
  approval_notes: string | null
  /** Release notes */
  release_notes: string | null
  /** Client response date (ISO string) */
  client_response_date: string | null
  /** Rejection reason */
  rejection_reason: string | null
}

// ---------------------------------------------------------------------------
// Expansion Task enums (ERP-12/13 — post-project growth tracking)
// ---------------------------------------------------------------------------

export const EXPANSION_TASK_TYPES = [
  'thank_you',
  'referral_request',
  'testimonial_request',
  'repeat_work_discovery',
  'case_study',
  'relationship_deepening',
] as const
export type ExpansionTaskType = (typeof EXPANSION_TASK_TYPES)[number]

export const EXPANSION_TASK_TYPE_LABELS: Record<ExpansionTaskType, string> = {
  thank_you: 'Thank You',
  referral_request: 'Referral Request',
  testimonial_request: 'Testimonial Request',
  repeat_work_discovery: 'Repeat Work Discovery',
  case_study: 'Case Study',
  relationship_deepening: 'Relationship Deepening',
}

// ---------------------------------------------------------------------------
// Expansion Task interface (ERP-12/13 — Expansion Opportunity)
// ---------------------------------------------------------------------------

export interface ExpansionTask extends BaseEntity {
  /** Human-readable reference ID: EXP-XXXX */
  reference_id: string
  /** Current lifecycle state */
  status: ExpansionTaskState
  /** Linked project ID (required) */
  linked_project_id: string
  /** Linked client ID (denormalized) */
  linked_client_id: string
  /** Task type */
  task_type: ExpansionTaskType
  /** Growth objective */
  growth_objective: string
  /** Due date (ISO string) */
  due_date: string
  /** Referral status (for referral tasks) */
  referral_status: string | null
  /** Testimonial status (for testimonial tasks) */
  testimonial_status: string | null
  /** True when this task generates a new Project Signal */
  next_signal_created: boolean
  /** Link to the new signal if created */
  next_signal_id: string | null
  /** Completion outcome */
  completion_outcome: string | null
}
