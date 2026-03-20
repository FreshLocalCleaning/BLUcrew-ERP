import { z } from 'zod/v4'
import { PURSUIT_STAGES } from '@/lib/state-machines/pursuit'
import {
  PURSUIT_SIGNAL_TYPES,
  PURSUIT_CLIENT_TYPES,
  PURSUIT_BUILD_TYPES,
  US_STATES,
  MILESTONE_STATUSES,
} from '@/types/commercial'

// ---------------------------------------------------------------------------
// Enum Zod types
// ---------------------------------------------------------------------------

export const PursuitSignalTypeSchema = z.enum(PURSUIT_SIGNAL_TYPES)
export const PursuitClientTypeSchema = z.enum(PURSUIT_CLIENT_TYPES)
export const PursuitBuildTypeSchema = z.enum(PURSUIT_BUILD_TYPES)
export const PursuitStageEnum = z.enum(PURSUIT_STAGES as unknown as [string, ...string[]])
export const USStateSchema = z.enum(US_STATES)

export const pursuitMilestoneSchema = z.object({
  name: z.string().min(1).max(200),
  date: z.string().nullable(),
  status: z.enum(MILESTONE_STATUSES),
  notes: z.string().max(2000).nullable(),
  is_default: z.boolean(),
})

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

/** Preprocess: convert empty strings to undefined so optional enum fields pass validation */
const emptyToUndefined = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional())
const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), z.enum(values).optional())

export const createPursuitSchema = z.object({
  linked_signal_id: z.string().min(1, 'A passed Project Signal is required to create a Pursuit'),
  project_name: z
    .string()
    .min(1, 'Project name is required')
    .max(300, 'Project name must be under 300 characters'),
  client_id: z.string().min(1, 'Client is required'),
  client_name: z.string().min(1, 'Client name is required'),
  primary_contact_id: emptyToUndefined,
  primary_contact_name: emptyToUndefined,
  signal_type: optionalEnum(PURSUIT_SIGNAL_TYPES as unknown as [string, ...string[]]),
  client_type: optionalEnum(PURSUIT_CLIENT_TYPES as unknown as [string, ...string[]]),
  build_type: optionalEnum(PURSUIT_BUILD_TYPES as unknown as [string, ...string[]]),
  location: z.string().max(500).optional(),
  us_state: optionalEnum(US_STATES as unknown as [string, ...string[]]),
  approx_sqft: z.preprocess((v) => (v === '' || v === undefined || v === null || Number.isNaN(v) ? undefined : Number(v)), z.number().int().positive().optional()),
  projected_substantial_completion: emptyToUndefined,
  target_owner_walk: emptyToUndefined,
  target_opening: emptyToUndefined,
  milestones: z.array(pursuitMilestoneSchema).optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: emptyToUndefined,
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
