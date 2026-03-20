'use server'

import {
  createProposalSchema,
  updateProposalSchema,
  proposalTransitionSchema,
} from '@/lib/validations/proposal'
import * as proposalDb from '@/lib/db/proposals'
import * as estimateDb from '@/lib/db/estimates'
import { validateTransition } from '@/lib/state-machines/engine'
import { proposalStateMachine, PROPOSAL_STATUS_LABELS } from '@/lib/state-machines/proposal'
import type { Proposal } from '@/types/commercial'
import type { ProposalStatus } from '@/lib/state-machines/proposal'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Placeholder: get current actor from session
// ---------------------------------------------------------------------------

function getCurrentActor() {
  return {
    id: 'system',
    name: 'System User',
    roles: ['leadership_system_admin', 'commercial_bd'] as Role[],
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/** Create a new proposal. Validates estimate gate (must be approved_for_proposal). */
export async function createProposalAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Proposal>> {
  const parsed = createProposalSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()

  // Gate check: linked estimate must exist and be at approved_for_proposal
  const estimate = estimateDb.getEstimate(parsed.data.linked_estimate_id)
  if (!estimate) {
    return { success: false, error: 'Linked Estimate not found' }
  }
  if (estimate.status !== 'approved_for_proposal') {
    return {
      success: false,
      error: `Estimate must be at "Approved for Proposal" status to create a Proposal (current: ${estimate.status}).`,
    }
  }

  const proposal = proposalDb.createProposal(
    {
      ...parsed.data,
      delivery_date: parsed.data.delivery_date ?? null,
      decision_target_date: parsed.data.decision_target_date ?? null,
      accepted_rejected_reason: null,
      acceptance_confirmation_method: null,
      decision_cadence_next_date: null,
      external_notes: parsed.data.external_notes ?? null,
    },
    actor.id,
  )

  return { success: true, data: proposal }
}

/** Update proposal fields. */
export async function updateProposalAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Proposal>> {
  const parsed = updateProposalSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
  const actor = getCurrentActor()
  const proposal = proposalDb.updateProposal(id, changes as any, actor.id)
  return { success: true, data: proposal }
}

/** Transition proposal status. */
export async function transitionProposalAction(
  input: Record<string, unknown>,
): Promise<ActionResult<Proposal>> {
  const parsed = proposalTransitionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { proposal_id, target_status, reason, approval_granted, acceptance_confirmation_method } = parsed.data
  const actor = getCurrentActor()

  const proposal = proposalDb.getProposal(proposal_id)
  if (!proposal) {
    return { success: false, error: 'Proposal not found' }
  }

  // If accepting, set the confirmation method on the entity for the blocker check
  const entityForValidation = { ...proposal } as Record<string, unknown>
  if (target_status === 'accepted' && acceptance_confirmation_method) {
    entityForValidation['acceptance_confirmation_method'] = acceptance_confirmation_method
  }

  const result = validateTransition(proposalStateMachine, {
    currentState: proposal.status,
    targetState: target_status,
    entity: entityForValidation,
    actorRoles: actor.roles,
    reason,
    approvalGranted: approval_granted,
  })

  if (!result.allowed) {
    return { success: false, error: result.errors.join(' ') }
  }

  const changes: Partial<Omit<Proposal, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>> = {
    status: target_status as ProposalStatus,
  }

  // Set reason on rejection
  if (target_status === 'rejected' && reason) {
    changes.accepted_rejected_reason = reason
  }

  // Set confirmation method on acceptance
  if (target_status === 'accepted' && acceptance_confirmation_method) {
    changes.acceptance_confirmation_method = acceptance_confirmation_method
  }

  const updated = proposalDb.updateProposal(
    proposal_id,
    changes,
    actor.id,
    reason ?? `Status changed to ${PROPOSAL_STATUS_LABELS[target_status as ProposalStatus] ?? target_status}`,
  )

  // Side effect: auto-create Award/Handoff when accepted
  if (target_status === 'accepted' && result.sideEffects.includes('auto_create_award_handoff')) {
    const { createFromAcceptedProposalAction } = await import('@/actions/award-handoff')
    const awardResult = await createFromAcceptedProposalAction(proposal_id)
    if (!awardResult.success) {
      // Log failure but don't block the proposal acceptance
      proposalDb.updateProposal(
        proposal_id,
        { created_award_id: `FAILED_${proposal_id}` },
        actor.id,
        `Award/Handoff auto-creation failed: ${awardResult.error}`,
      )
    }
  }

  return { success: true, data: updated }
}

export async function getProposalAction(id: string): Promise<ActionResult<Proposal>> {
  const proposal = proposalDb.getProposal(id)
  if (!proposal) {
    return { success: false, error: 'Proposal not found' }
  }
  return { success: true, data: proposal }
}

export async function listProposalsAction(): Promise<ActionResult<Proposal[]>> {
  const proposals = proposalDb.listProposals()
  return { success: true, data: proposals }
}

export async function getProposalAuditAction(proposalId: string) {
  const log = proposalDb.getProposalAuditLog(proposalId)
  return { success: true, data: log }
}
