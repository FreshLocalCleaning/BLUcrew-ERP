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
// Create Schema
// ---------------------------------------------------------------------------

export const createClientSchema = z.object({
  name: z
    .string()
    .min(1, 'Client name is required')
    .max(200, 'Client name must be under 200 characters'),
  dba: z.string().max(200).optional(),
  tier: ClientTierSchema.optional(),
  vertical: ClientVerticalSchema.optional(),
  market: ClientMarketSchema.optional(),
  relationship_strength: ClientRelationshipSchema.optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: z.string().optional(),
  notes: z.string().max(5000).optional(),
  bd_owner_id: z.string().optional(),
  bd_owner_name: z.string().optional(),
  ghl_company_id: z.string().optional(),
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
