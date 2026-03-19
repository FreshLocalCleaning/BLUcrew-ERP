import { z } from 'zod/v4'
import { PURSUIT_STAGES } from '@/lib/state-machines/pursuit'
import {
  PURSUIT_SIGNAL_TYPES,
  PURSUIT_CLIENT_TYPES,
  PURSUIT_BUILD_TYPES,
} from '@/types/commercial'

// ---------------------------------------------------------------------------
// Enum Zod types
// ---------------------------------------------------------------------------

export const PursuitSignalTypeSchema = z.enum(PURSUIT_SIGNAL_TYPES)
export const PursuitClientTypeSchema = z.enum(PURSUIT_CLIENT_TYPES)
export const PursuitBuildTypeSchema = z.enum(PURSUIT_BUILD_TYPES)
export const PursuitStageEnum = z.enum(PURSUIT_STAGES as unknown as [string, ...string[]])

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

export const createPursuitSchema = z.object({
  linked_signal_id: z.string().min(1, 'A passed Project Signal is required to create a Pursuit'),
  project_name: z
    .string()
    .min(1, 'Project name is required')
    .max(300, 'Project name must be under 300 characters'),
  client_id: z.string().min(1, 'Client is required'),
  client_name: z.string().min(1, 'Client name is required'),
  primary_contact_id: z.string().optional(),
  primary_contact_name: z.string().optional(),
  signal_type: PursuitSignalTypeSchema.optional(),
  client_type: PursuitClientTypeSchema.optional(),
  build_type: PursuitBuildTypeSchema.optional(),
  location: z.string().max(500).optional(),
  approx_sqft: z.number().int().positive().optional(),
  projected_substantial_completion: z.string().optional(),
  target_owner_walk: z.string().optional(),
  target_opening: z.string().optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: z.string().optional(),
  notes: z.string().max(5000).optional(),
})

export type CreatePursuitInput = z.infer<typeof createPursuitSchema>

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updatePursuitSchema = createPursuitSchema.partial().extend({
  id: z.string().min(1, 'Pursuit ID is required'),
  no_bid_reason: z.string().max(2000).optional(),
})

export type UpdatePursuitInput = z.infer<typeof updatePursuitSchema>

// ---------------------------------------------------------------------------
// Transition Schema
// ---------------------------------------------------------------------------

export const pursuitTransitionSchema = z.object({
  pursuit_id: z.string().min(1),
  target_stage: PursuitStageEnum,
  reason: z.string().max(2000).optional(),
  approval_granted: z.boolean().optional(),
})

export type PursuitTransitionInput = z.infer<typeof pursuitTransitionSchema>
