'use server'

import {
  createEstimateSchema,
  updateEstimateSchema,
  saveEstimatorStateSchema,
  estimateTransitionSchema,
} from '@/lib/validations/estimate'
import * as estimateDb from '@/lib/db/estimates'
import * as pursuitDb from '@/lib/db/pursuits'
import { validateTransition } from '@/lib/state-machines/engine'
import { estimateStateMachine, ESTIMATE_STATUS_LABELS } from '@/lib/state-machines/estimate'
import type { Estimate } from '@/types/commercial'
import type { EstimateStatus } from '@/lib/state-machines/estimate'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Placeholder: get current actor from session
// ---------------------------------------------------------------------------

function getCurrentActor() {
  return {
    id: 'system',
    name: 'System User',
    roles: ['leadership_system_admin', 'estimating'] as Role[],
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

/** Create a new estimate. Validates pursuit gate (must be at estimate_ready). */
export async function createEstimateAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Estimate>> {
  const parsed = createEstimateSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()

  // Gate check: linked pursuit must exist and be at estimate_ready
  const pursuit = pursuitDb.getPursuit(parsed.data.linked_pursuit_id)
  if (!pursuit) {
    return { success: false, error: 'Linked Pursuit not found' }
  }
  if (pursuit.stage !== 'estimate_ready') {
    return {
      success: false,
      error: `Pursuit must be at "Estimate Ready" stage to create an Estimate (current: ${pursuit.stage}).`,
    }
  }

  // Check if there's already an active (non-superseded) estimate for this pursuit
  const existing = estimateDb.getActiveEstimateForPursuit(parsed.data.linked_pursuit_id)
  if (existing) {
    return {
      success: false,
      error: `An active estimate already exists for this pursuit (${existing.reference_id}). Supersede it first to create a new version.`,
    }
  }

  const estimate = estimateDb.createEstimate(
    {
      ...parsed.data,
      build_type: (parsed.data.build_type as string) ?? null,
      square_footage: (parsed.data.square_footage as number) ?? null,
      stage_count: null,
      stage_selections: [],
      tier_index: null,
      base_rate: null,
      blu3_rate: null,
      surcharges: [],
      mobilization_cost: null,
      exterior_cost: null,
      window_cost: null,
      per_diem_cost: null,
      labor_target_hours: null,
      assumptions: null,
      exclusions: null,
      scope_text: null,
      pricing_summary: null,
      qa_reviewer_id: null,
      qa_reviewer_name: null,
      qa_notes: null,
      estimator_snapshot: null,
    },
    actor.id,
  )

  return { success: true, data: estimate }
}

/** Update estimate fields. */
export async function updateEstimateAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Estimate>> {
  const parsed = updateEstimateSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
  const actor = getCurrentActor()
  const estimate = estimateDb.updateEstimate(id, changes, actor.id)
  return { success: true, data: estimate }
}

/** Save estimator state snapshot — called during build from the embedded FLC Estimator. */
export async function saveEstimatorStateAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Estimate>> {
  const parsed = saveEstimatorStateSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...stateData } = parsed.data
  const actor = getCurrentActor()

  const existing = estimateDb.getEstimate(id)
  if (!existing) {
    return { success: false, error: 'Estimate not found' }
  }

  // Only allow saving state when in draft or in_build
  if (existing.status !== 'draft' && existing.status !== 'in_build') {
    return {
      success: false,
      error: `Cannot save estimator state when estimate is at "${ESTIMATE_STATUS_LABELS[existing.status]}". Only Draft and In Build estimates can be edited.`,
    }
  }

  const estimate = estimateDb.updateEstimate(
    id,
    stateData,
    actor.id,
    'Estimator state saved',
  )
  return { success: true, data: estimate }
}

/** Transition estimate status. */
export async function transitionEstimateAction(
  input: Record<string, unknown>,
): Promise<ActionResult<Estimate>> {
  const parsed = estimateTransitionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { estimate_id, target_status, reason, approval_granted } = parsed.data
  const actor = getCurrentActor()

  const estimate = estimateDb.getEstimate(estimate_id)
  if (!estimate) {
    return { success: false, error: 'Estimate not found' }
  }

  const result = validateTransition(estimateStateMachine, {
    currentState: estimate.status,
    targetState: target_status,
    entity: estimate as unknown as Record<string, unknown>,
    actorRoles: actor.roles,
    reason,
    approvalGranted: approval_granted,
  })

  if (!result.allowed) {
    return { success: false, error: result.errors.join(' ') }
  }

  const changes: Partial<Omit<Estimate, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>> = {
    status: target_status as EstimateStatus,
  }

  const updated = estimateDb.updateEstimate(
    estimate_id,
    changes,
    actor.id,
    reason ?? `Status changed to ${ESTIMATE_STATUS_LABELS[target_status as EstimateStatus] ?? target_status}`,
  )

  return { success: true, data: updated }
}

/** Create a new version of an estimate (supersedes the current one). */
export async function createNewVersionAction(
  estimateId: string,
  reason: string,
): Promise<ActionResult<Estimate>> {
  const actor = getCurrentActor()

  const current = estimateDb.getEstimate(estimateId)
  if (!current) {
    return { success: false, error: 'Estimate not found' }
  }

  if (current.status !== 'approved_for_proposal') {
    return {
      success: false,
      error: 'Only approved estimates can be superseded with a new version.',
    }
  }

  // Create the new version
  const newEstimate = estimateDb.createEstimate(
    {
      linked_pursuit_id: current.linked_pursuit_id,
      linked_client_id: current.linked_client_id,
      linked_client_name: current.linked_client_name,
      linked_pursuit_name: current.linked_pursuit_name,
      project_name: current.project_name,
      build_type: current.build_type,
      square_footage: current.square_footage,
      stage_count: current.stage_count,
      stage_selections: current.stage_selections,
      tier_index: current.tier_index,
      base_rate: current.base_rate,
      blu3_rate: current.blu3_rate,
      surcharges: current.surcharges,
      mobilization_cost: current.mobilization_cost,
      exterior_cost: current.exterior_cost,
      window_cost: current.window_cost,
      per_diem_cost: current.per_diem_cost,
      labor_target_hours: current.labor_target_hours,
      assumptions: current.assumptions,
      exclusions: current.exclusions,
      scope_text: current.scope_text,
      pricing_summary: null, // Reset pricing — must be re-reviewed
      qa_reviewer_id: null,
      qa_reviewer_name: null,
      qa_notes: null,
      estimator_snapshot: current.estimator_snapshot,
      version: current.version + 1,
    },
    actor.id,
  )

  // Supersede the old version
  estimateDb.updateEstimate(
    current.id,
    {
      status: 'superseded' as EstimateStatus,
      superseded_by_id: newEstimate.id,
    },
    actor.id,
    reason,
  )

  return { success: true, data: newEstimate }
}

export async function getEstimateAction(id: string): Promise<ActionResult<Estimate>> {
  const estimate = estimateDb.getEstimate(id)
  if (!estimate) {
    return { success: false, error: 'Estimate not found' }
  }
  return { success: true, data: estimate }
}

export async function listEstimatesAction(): Promise<ActionResult<Estimate[]>> {
  const estimates = estimateDb.listEstimates()
  return { success: true, data: estimates }
}

export async function getEstimateAuditAction(estimateId: string) {
  const log = estimateDb.getEstimateAuditLog(estimateId)
  return { success: true, data: log }
}
