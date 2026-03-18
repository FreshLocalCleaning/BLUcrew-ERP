/**
 * Commercial ERP — Entity Type Definitions
 *
 * Canonical interfaces for all entities.
 * Enums come from ERP-02 Key Enum Anchors.
 */

import type { BaseEntity } from '@/lib/db/json-db'
import type { ClientState } from '@/lib/state-machines/client'

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
