'use server'

import { createPursuitSchema, updatePursuitSchema, pursuitTransitionSchema } from '@/lib/validations/pursuit'
import * as pursuitDb from '@/lib/db/pursuits'
import { validateTransition } from '@/lib/state-machines/engine'
import { pursuitStateMachine, PURSUIT_STAGE_LABELS } from '@/lib/state-machines/pursuit'
import type { Pursuit } from '@/types/commercial'
import type { PursuitStage } from '@/lib/state-machines/pursuit'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Placeholder: get current actor from session
// ---------------------------------------------------------------------------

function getCurrentActor() {
  return {
    id: 'system',
    name: 'System User',
    roles: ['COM_LEAD'] as Role[],
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

export async function createPursuitAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Pursuit>> {
  const parsed = createPursuitSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()
  const pursuit = pursuitDb.createPursuit(parsed.data, actor.id)
  return { success: true, data: pursuit }
}

export async function updatePursuitAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Pursuit>> {
  const parsed = updatePursuitSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
  const actor = getCurrentActor()
  const pursuit = pursuitDb.updatePursuit(id, changes, actor.id)
  return { success: true, data: pursuit }
}

export async function transitionPursuitAction(
  input: Record<string, unknown>,
): Promise<ActionResult<Pursuit>> {
  const parsed = pursuitTransitionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { pursuit_id, target_stage, reason, approval_granted } = parsed.data
  const actor = getCurrentActor()

  const pursuit = pursuitDb.getPursuit(pursuit_id)
  if (!pursuit) {
    return { success: false, error: 'Pursuit not found' }
  }

  const result = validateTransition(pursuitStateMachine, {
    currentState: pursuit.stage,
    targetState: target_stage,
    entity: pursuit as unknown as Record<string, unknown>,
    actorRoles: actor.roles,
    reason,
    approvalGranted: approval_granted,
  })

  if (!result.allowed) {
    return { success: false, error: result.errors.join(' ') }
  }

  const changes: Partial<Omit<Pursuit, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>> = {
    stage: target_stage as PursuitStage,
  }

  if (target_stage === 'no_bid' && reason) {
    changes.no_bid_reason = reason
  }

  const updated = pursuitDb.updatePursuit(
    pursuit_id,
    changes,
    actor.id,
    reason ?? `Stage changed to ${PURSUIT_STAGE_LABELS[target_stage as PursuitStage] ?? target_stage}`,
  )

  return { success: true, data: updated }
}

export async function getPursuitAction(id: string): Promise<ActionResult<Pursuit>> {
  const pursuit = pursuitDb.getPursuit(id)
  if (!pursuit) {
    return { success: false, error: 'Pursuit not found' }
  }
  return { success: true, data: pursuit }
}

export async function listPursuitsAction(): Promise<ActionResult<Pursuit[]>> {
  const pursuits = pursuitDb.listPursuits()
  return { success: true, data: pursuits }
}

export async function getPursuitAuditAction(pursuitId: string) {
  const log = pursuitDb.getPursuitAuditLog(pursuitId)
  return { success: true, data: log }
}
