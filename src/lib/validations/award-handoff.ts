import { z } from 'zod/v4'
import { AWARD_HANDOFF_STATES } from '@/lib/state-machines/award-handoff'

// ---------------------------------------------------------------------------
// Enum Zod types
// ---------------------------------------------------------------------------

export const AwardHandoffStateEnum = z.enum(AWARD_HANDOFF_STATES as unknown as [string, ...string[]])

const ComplianceDocStatusEnum = z.enum(['pending', 'received', 'waived'])
const StartupBlockerStatusEnum = z.enum(['open', 'resolved'])

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const complianceDocItemSchema = z.object({
  doc_name: z.string().min(1, 'Document name is required'),
  required: z.boolean(),
  status: ComplianceDocStatusEnum,
  received_date: z.string().nullable(),
  notes: z.string().max(2000).nullable(),
})

export const startupBlockerItemSchema = z.object({
  blocker: z.string().min(1, 'Blocker description is required'),
  owner: z.string().min(1, 'Blocker owner is required'),
  status: StartupBlockerStatusEnum,
  resolved_date: z.string().nullable(),
})

// ---------------------------------------------------------------------------
// Create Schema (auto-created from accepted proposal)
// ---------------------------------------------------------------------------

export const createAwardHandoffSchema = z.object({
  linked_proposal_id: z.string().min(1, 'Proposal ID is required'),
  linked_pursuit_id: z.string().min(1, 'Pursuit ID is required'),
  linked_estimate_id: z.string().min(1, 'Estimate ID is required'),
  linked_client_id: z.string().min(1, 'Client ID is required'),
  project_name: z.string().min(1, 'Project name is required').max(300),
  accepted_baseline_snapshot: z.record(z.string(), z.unknown()),
  compliance_tracker: z.array(complianceDocItemSchema).default([]),
  startup_blockers: z.array(startupBlockerItemSchema).default([]),
  teams_handoff_post_url: z.string().nullable().default(null),
  pm_claim_user_id: z.string().nullable().default(null),
  pm_claim_timestamp: z.string().nullable().default(null),
})

export type CreateAwardHandoffInput = z.infer<typeof createAwardHandoffSchema>

// ---------------------------------------------------------------------------
// Preprocess helpers: convert empty strings from HTML inputs to undefined
// ---------------------------------------------------------------------------

const emptyToUndefined = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional())

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updateAwardHandoffSchema = z.object({
  id: z.string().min(1, 'Award/Handoff ID is required'),
  compliance_tracker: z.array(complianceDocItemSchema).optional(),
  startup_blockers: z.array(startupBlockerItemSchema).optional(),
  teams_handoff_post_url: z.string().nullable().optional(),
  pm_claim_user_id: z.string().nullable().optional(),
  pm_claim_timestamp: z.preprocess((v) => (v === '' ? null : v), z.string().nullable().optional()),
  next_action: z.string().max(500).optional(),
  next_action_date: emptyToUndefined,
})

export type UpdateAwardHandoffInput = z.infer<typeof updateAwardHandoffSchema>

// ---------------------------------------------------------------------------
// Transition Schema
// ---------------------------------------------------------------------------

export const awardHandoffTransitionSchema = z.object({
  award_handoff_id: z.string().min(1),
  target_status: AwardHandoffStateEnum,
  reason: z.string().max(2000).optional(),
  approval_granted: z.boolean().optional(),
  pm_claim_user_id: z.string().optional(),
})

export type AwardHandoffTransitionInput = z.infer<typeof awardHandoffTransitionSchema>

// ---------------------------------------------------------------------------
// Compliance Doc Add/Update Schema
// ---------------------------------------------------------------------------

export const addComplianceDocSchema = z.object({
  award_handoff_id: z.string().min(1),
  doc: complianceDocItemSchema,
})

export type AddComplianceDocInput = z.infer<typeof addComplianceDocSchema>

// ---------------------------------------------------------------------------
// Startup Blocker Schemas
// ---------------------------------------------------------------------------

export const addStartupBlockerSchema = z.object({
  award_handoff_id: z.string().min(1),
  blocker: z.string().min(1, 'Blocker description is required'),
  owner: z.string().min(1, 'Blocker owner is required'),
})

export type AddStartupBlockerInput = z.infer<typeof addStartupBlockerSchema>

export const resolveBlockerSchema = z.object({
  award_handoff_id: z.string().min(1),
  blocker_index: z.number().int().min(0),
})

export type ResolveBlockerInput = z.infer<typeof resolveBlockerSchema>
