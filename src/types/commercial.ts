/**
 * Commercial ERP — Entity Type Definitions
 *
 * Canonical interfaces for all entities.
 * Enums come from ERP-02 Key Enum Anchors.
 */

import type { BaseEntity } from '@/lib/db/json-db'
import type { ClientState } from '@/lib/state-machines/client'
import type { PursuitStage } from '@/lib/state-machines/pursuit'

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
  /** Next action text */
  next_action?: string
  /** Next action due date (ISO string) */
  next_action_date?: string
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
  /** Last touch date (ISO string) */
  last_touch_date?: string
  /** Touch count */
  touch_count: number
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
  /** Next action text */
  next_action?: string
  /** Next action due date (ISO string) */
  next_action_date?: string
  /** General notes */
  notes?: string
  /** BD owner user ID */
  bd_owner_id?: string
  /** BD owner display name (denormalized) */
  bd_owner_name?: string
  /** No-bid reason (if pursuit was no-bid) */
  no_bid_reason?: string
}
