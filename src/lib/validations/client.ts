import { z } from 'zod/v4'
import { CLIENT_STATES } from '@/lib/state-machines/client'
import {
  CLIENT_TIERS,
  CLIENT_VERTICALS,
  CLIENT_MARKETS,
  CLIENT_RELATIONSHIP_STRENGTHS,
} from '@/types/commercial'

// ---------------------------------------------------------------------------
// Enum Zod types
// ---------------------------------------------------------------------------

export const ClientTierSchema = z.enum(CLIENT_TIERS)
export const ClientVerticalSchema = z.enum(CLIENT_VERTICALS)
export const ClientMarketSchema = z.enum(CLIENT_MARKETS)
export const ClientRelationshipSchema = z.enum(CLIENT_RELATIONSHIP_STRENGTHS)
export const ClientStateEnum = z.enum(CLIENT_STATES as unknown as [string, ...string[]])

// ---------------------------------------------------------------------------
// Preprocess helpers: convert empty strings from HTML selects to undefined
// ---------------------------------------------------------------------------

const emptyToUndefined = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional())
const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), z.enum(values).optional())

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

export const createClientSchema = z.object({
  name: z
    .string()
    .min(1, 'Client name is required')
    .max(200, 'Client name must be under 200 characters'),
  dba: z.string().max(200).optional(),
  tier: optionalEnum(CLIENT_TIERS as unknown as [string, ...string[]]),
  vertical: optionalEnum(CLIENT_VERTICALS as unknown as [string, ...string[]]),
  market: optionalEnum(CLIENT_MARKETS as unknown as [string, ...string[]]),
  relationship_strength: optionalEnum(CLIENT_RELATIONSHIP_STRENGTHS as unknown as [string, ...string[]]),
  next_action: z.string().max(500).optional(),
  next_action_date: emptyToUndefined,
  notes: z.string().max(5000).optional(),
  bd_owner_id: emptyToUndefined,
  bd_owner_name: emptyToUndefined,
  ghl_company_id: z.string().optional(),
  preferred_provider_candidate: z.boolean().default(false),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updateClientSchema = createClientSchema.partial().extend({
  id: z.string().min(1, 'Client ID is required'),
  won_award_id: z.string().optional(),
})

export type UpdateClientInput = z.infer<typeof updateClientSchema>

// ---------------------------------------------------------------------------
// Transition Schema
// ---------------------------------------------------------------------------

export const clientTransitionSchema = z.object({
  client_id: z.string().min(1),
  target_state: ClientStateEnum,
  reason: z.string().max(2000).optional(),
  approval_granted: z.boolean().optional(),
})

export type ClientTransitionInput = z.infer<typeof clientTransitionSchema>
