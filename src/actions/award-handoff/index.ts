'use server'

import {
  createAwardHandoffSchema,
  updateAwardHandoffSchema,
  awardHandoffTransitionSchema,
  addComplianceDocSchema,
  addStartupBlockerSchema,
  resolveBlockerSchema,
} from '@/lib/validations/award-handoff'
import * as awardHandoffDb from '@/lib/db/award-handoffs'
import * as proposalDb from '@/lib/db/proposals'
import * as estimateDb from '@/lib/db/estimates'
import * as projectDb from '@/lib/db/projects'
import { validateTransition } from '@/lib/state-machines/engine'
import {
  awardHandoffStateMachine,
  AWARD_HANDOFF_STATE_LABELS,
} from '@/lib/state-machines/award-handoff'
import type { AwardHandoff, ComplianceDocItem, StartupBlockerItem } from '@/types/commercial'
import type { AwardHandoffState } from '@/lib/state-machines/award-handoff'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Placeholder: get current actor from session
// ---------------------------------------------------------------------------

function getCurrentActor() {
  return {
    id: 'system',
    name: 'System User',
    roles: ['leadership_system_admin', 'commercial_bd', 'pm_ops'] as Role[],
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

/**
 * Auto-create Award/Handoff from accepted proposal.
 * Called as a side effect when a Proposal reaches "accepted".
 */
export async function createFromAcceptedProposalAction(
  proposalId: string,
): Promise<ActionResult<AwardHandoff>> {
  const actor = getCurrentActor()

  const proposal = proposalDb.getProposal(proposalId)
  if (!proposal) {
    return { success: false, error: 'Proposal not found' }
  }
  if (proposal.status !== 'accepted') {
    return { success: false, error: 'Proposal must be accepted to create Award/Handoff' }
  }

  // Get the linked estimate to snapshot the baseline
  const estimate = estimateDb.getEstimate(proposal.linked_estimate_id)
  if (!estimate) {
    return { success: false, error: 'Linked Estimate not found' }
  }

  // Build the baseline snapshot from the estimate
  const baselineSnapshot: Record<string, unknown> = {
    estimate_id: estimate.id,
    estimate_ref: estimate.reference_id,
    proposal_id: proposal.id,
    proposal_ref: proposal.reference_id,
    project_name: proposal.project_name,
    build_type: estimate.build_type,
    square_footage: estimate.square_footage,
    tier_index: estimate.tier_index,
    stage_count: estimate.stage_count,
    stage_selections: estimate.stage_selections,
    pricing_summary: estimate.pricing_summary,
    proposal_value: proposal.proposal_value,
    assumptions: estimate.assumptions,
    exclusions: estimate.exclusions,
    scope_text: estimate.scope_text,
    mobilization_cost: estimate.mobilization_cost,
    exterior_cost: estimate.exterior_cost,
    window_cost: estimate.window_cost,
    per_diem_cost: estimate.per_diem_cost,
    surcharges: estimate.surcharges,
    snapshot_date: new Date().toISOString(),
  }

  // Default compliance checklist
  const defaultComplianceDocs: ComplianceDocItem[] = [
    { doc_name: 'Certificate of Insurance (COI)', required: true, status: 'pending', received_date: null, notes: null },
    { doc_name: 'W-9', required: true, status: 'pending', received_date: null, notes: null },
    { doc_name: 'Signed Subcontract / PO', required: true, status: 'pending', received_date: null, notes: null },
    { doc_name: 'Safety Plan', required: true, status: 'pending', received_date: null, notes: null },
    { doc_name: 'Background Check Clearance', required: false, status: 'pending', received_date: null, notes: null },
  ]

  const data = {
    linked_proposal_id: proposal.id,
    linked_pursuit_id: proposal.linked_pursuit_id,
    linked_estimate_id: proposal.linked_estimate_id,
    linked_client_id: proposal.linked_client_id,
    project_name: proposal.project_name,
    accepted_baseline_snapshot: baselineSnapshot,
    compliance_tracker: defaultComplianceDocs,
    startup_blockers: [] as StartupBlockerItem[],
    teams_handoff_post_url: null,
    pm_claim_user_id: null,
    pm_claim_timestamp: null,
    owner: actor.id,
    next_action: 'Begin compliance document collection',
    next_action_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }

  const parsed = createAwardHandoffSchema.safeParse(data)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const awardHandoff = awardHandoffDb.createAwardHandoff(
    data as Omit<AwardHandoff, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state' | 'reference_id' | 'status' | 'created_project_id'>,
    actor.id,
  )

  // Link back to proposal
  proposalDb.updateProposal(
    proposalId,
    { created_award_id: awardHandoff.id },
    actor.id,
    `Award/Handoff ${awardHandoff.reference_id} auto-created from acceptance`,
  )

  return { success: true, data: awardHandoff }
}

/** Add or update a compliance document. */
export async function addComplianceDocAction(
  input: Record<string, unknown>,
): Promise<ActionResult<AwardHandoff>> {
  const parsed = addComplianceDocSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()
  const awardHandoff = awardHandoffDb.getAwardHandoff(parsed.data.award_handoff_id)
  if (!awardHandoff) {
    return { success: false, error: 'Award/Handoff not found' }
  }

  const tracker = [...awardHandoff.compliance_tracker]
  const existingIdx = tracker.findIndex((d) => d.doc_name === parsed.data.doc.doc_name)
  if (existingIdx >= 0) {
    tracker[existingIdx] = parsed.data.doc
  } else {
    tracker.push(parsed.data.doc)
  }

  const updated = awardHandoffDb.updateAwardHandoff(
    parsed.data.award_handoff_id,
    { compliance_tracker: tracker },
    actor.id,
    `Compliance doc "${parsed.data.doc.doc_name}" updated to ${parsed.data.doc.status}`,
  )

  return { success: true, data: updated }
}

/** Add a startup blocker. */
export async function addStartupBlockerAction(
  input: Record<string, unknown>,
): Promise<ActionResult<AwardHandoff>> {
  const parsed = addStartupBlockerSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()
  const awardHandoff = awardHandoffDb.getAwardHandoff(parsed.data.award_handoff_id)
  if (!awardHandoff) {
    return { success: false, error: 'Award/Handoff not found' }
  }

  const blockers: StartupBlockerItem[] = [
    ...awardHandoff.startup_blockers,
    {
      blocker: parsed.data.blocker,
      owner: parsed.data.owner,
      status: 'open',
      resolved_date: null,
    },
  ]

  const updated = awardHandoffDb.updateAwardHandoff(
    parsed.data.award_handoff_id,
    { startup_blockers: blockers },
    actor.id,
    `Startup blocker added: "${parsed.data.blocker}"`,
  )

  return { success: true, data: updated }
}

/** Resolve a startup blocker by index. */
export async function resolveBlockerAction(
  input: Record<string, unknown>,
): Promise<ActionResult<AwardHandoff>> {
  const parsed = resolveBlockerSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()
  const awardHandoff = awardHandoffDb.getAwardHandoff(parsed.data.award_handoff_id)
  if (!awardHandoff) {
    return { success: false, error: 'Award/Handoff not found' }
  }

  if (parsed.data.blocker_index >= awardHandoff.startup_blockers.length) {
    return { success: false, error: 'Blocker index out of range' }
  }

  const blockers = [...awardHandoff.startup_blockers]
  blockers[parsed.data.blocker_index] = {
    ...blockers[parsed.data.blocker_index]!,
    status: 'resolved',
    resolved_date: new Date().toISOString(),
  }

  const updated = awardHandoffDb.updateAwardHandoff(
    parsed.data.award_handoff_id,
    { startup_blockers: blockers },
    actor.id,
    `Startup blocker resolved: "${blockers[parsed.data.blocker_index]!.blocker}"`,
  )

  return { success: true, data: updated }
}

/** Transition award/handoff status. */
export async function transitionAwardHandoffAction(
  input: Record<string, unknown>,
): Promise<ActionResult<AwardHandoff>> {
  const parsed = awardHandoffTransitionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { award_handoff_id, target_status, reason, approval_granted, pm_claim_user_id } = parsed.data
  const actor = getCurrentActor()

  const awardHandoff = awardHandoffDb.getAwardHandoff(award_handoff_id)
  if (!awardHandoff) {
    return { success: false, error: 'Award/Handoff not found' }
  }

  // For PM claim, set the user ID on the entity for field validation
  const entityForValidation = { ...awardHandoff } as Record<string, unknown>
  if (target_status === 'pm_claimed' && pm_claim_user_id) {
    entityForValidation['pm_claim_user_id'] = pm_claim_user_id
  }

  const result = validateTransition(awardHandoffStateMachine, {
    currentState: awardHandoff.status,
    targetState: target_status,
    entity: entityForValidation,
    actorRoles: actor.roles,
    reason,
    approvalGranted: approval_granted,
  })

  if (!result.allowed) {
    return { success: false, error: result.errors.join(' ') }
  }

  const changes: Partial<Omit<AwardHandoff, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>> = {
    status: target_status as AwardHandoffState,
  }

  // Set PM claim data
  if (target_status === 'pm_claimed' && pm_claim_user_id) {
    changes.pm_claim_user_id = pm_claim_user_id
    changes.pm_claim_timestamp = new Date().toISOString()
  }

  const updated = awardHandoffDb.updateAwardHandoff(
    award_handoff_id,
    changes,
    actor.id,
    reason ?? `Status changed to ${AWARD_HANDOFF_STATE_LABELS[target_status as AwardHandoffState] ?? target_status}`,
  )

  // Side effect: auto-create Project when closed_to_ops
  if (target_status === 'closed_to_ops' && result.sideEffects.includes('auto_create_project')) {
    const project = projectDb.createProject(
      {
        linked_award_handoff_id: awardHandoff.id,
        linked_client_id: awardHandoff.linked_client_id,
        project_name: awardHandoff.project_name,
        pm_owner_id: awardHandoff.pm_claim_user_id ?? actor.id,
        commercial_baseline_snapshot: awardHandoff.accepted_baseline_snapshot,
        client_stage_map: null,
        target_turnover_date: null,
        billing_references: null,
        active_change_order_count: 0,
        owner: awardHandoff.pm_claim_user_id ?? actor.id,
        next_action: 'Complete project startup and begin forecasting',
        next_action_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      } as Omit<import('@/types/commercial').Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state' | 'reference_id' | 'status'>,
      actor.id,
    )

    // Link back to award/handoff
    awardHandoffDb.updateAwardHandoff(
      award_handoff_id,
      { created_project_id: project.id },
      actor.id,
      `Project ${project.reference_id} auto-created from closed_to_ops`,
    )
  }

  return { success: true, data: updated }
}

/** Update award/handoff fields. */
export async function updateAwardHandoffAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<AwardHandoff>> {
  const parsed = updateAwardHandoffSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
  const actor = getCurrentActor()
  const updated = awardHandoffDb.updateAwardHandoff(id, changes, actor.id)
  return { success: true, data: updated }
}

export async function getAwardHandoffAction(id: string): Promise<ActionResult<AwardHandoff>> {
  const awardHandoff = awardHandoffDb.getAwardHandoff(id)
  if (!awardHandoff) {
    return { success: false, error: 'Award/Handoff not found' }
  }
  return { success: true, data: awardHandoff }
}

export async function listAwardHandoffsAction(): Promise<ActionResult<AwardHandoff[]>> {
  const awardHandoffs = awardHandoffDb.listAwardHandoffs()
  return { success: true, data: awardHandoffs }
}

export async function getAwardHandoffAuditAction(awardHandoffId: string) {
  const log = awardHandoffDb.getAwardHandoffAuditLog(awardHandoffId)
  return { success: true, data: log }
}
