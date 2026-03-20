import { z } from 'zod/v4'
import { PROPOSAL_STATUSES } from '@/lib/state-machines/proposal'
import { PROPOSAL_ACCEPTANCE_METHODS } from '@/types/commercial'

// ---------------------------------------------------------------------------
// Enum Zod types
// ---------------------------------------------------------------------------

export const ProposalStatusEnum = z.enum(PROPOSAL_STATUSES as unknown as [string, ...string[]])
export const ProposalAcceptanceMethodEnum = z.enum(PROPOSAL_ACCEPTANCE_METHODS)

// ---------------------------------------------------------------------------
// Preprocess helpers: convert empty strings from HTML inputs to undefined
// ---------------------------------------------------------------------------

const emptyToUndefined = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional())
const emptyToNull = z.preprocess((v) => (v === '' ? null : v), z.string().nullable().optional())
const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), z.enum(values).optional())
const nullableOptionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === '' ? null : v), z.enum(values).nullable().optional())

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

export const createProposalSchema = z.object({
  linked_estimate_id: z.string().min(1, 'An approved Estimate is required to create a Proposal'),
  linked_pursuit_id: z.string().min(1, 'Pursuit ID is required'),
  linked_client_id: z.string().min(1, 'Client ID is required'),
  linked_client_name: z.string().min(1, 'Client name is required'),
  project_name: z
    .string()
    .min(1, 'Project name is required')
    .max(300, 'Project name must be under 300 characters'),
  proposal_value: z.number().positive('Proposal value must be positive'),
  version: z.number().int().positive().default(1),
  delivery_date: emptyToNull,
  decision_target_date: emptyToNull,
  external_notes: z.string().max(5000).nullable().optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: emptyToUndefined,
})

export type CreateProposalInput = z.infer<typeof createProposalSchema>

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updateProposalSchema = z.object({
  id: z.string().min(1, 'Proposal ID is required'),
  proposal_value: z.number().positive().optional(),
  delivery_date: emptyToNull,
  decision_target_date: emptyToNull,
  accepted_rejected_reason: z.string().max(2000).nullable().optional(),
  acceptance_confirmation_method: nullableOptionalEnum(PROPOSAL_ACCEPTANCE_METHODS as unknown as [string, ...string[]]),
  decision_cadence_next_date: emptyToNull,
  external_notes: z.string().max(5000).nullable().optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: emptyToUndefined,
})

export type UpdateProposalInput = z.infer<typeof updateProposalSchema>

// ---------------------------------------------------------------------------
// Transition Schema
// ---------------------------------------------------------------------------

export const proposalTransitionSchema = z.object({
  proposal_id: z.string().min(1),
  target_status: ProposalStatusEnum,
  reason: z.string().max(2000).optional(),
  approval_granted: z.boolean().optional(),
  acceptance_confirmation_method: ProposalAcceptanceMethodEnum.optional(),
})

export type ProposalTransitionInput = z.infer<typeof proposalTransitionSchema>
