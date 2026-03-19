'use server'

import {
  createMobilizationSchema,
  updateMobilizationSchema,
  mobilizationTransitionSchema,
  addDailyReportSchema,
  updateReadinessChecklistSchema,
  compressedPlanningOverrideSchema,
} from '@/lib/validations/mobilization'
import * as mobilizationDb from '@/lib/db/mobilizations'
import * as projectDb from '@/lib/db/projects'
import { validateTransition } from '@/lib/state-machines/engine'
import {
  mobilizationStateMachine,
  MOBILIZATION_STATE_LABELS,
} from '@/lib/state-machines/mobilization'
import type { Mobilization } from '@/types/commercial'
import type { MobilizationState } from '@/lib/state-machines/mobilization'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Placeholder: get current actor from session
// ---------------------------------------------------------------------------

function getCurrentActor() {
  return {
    id: 'system',
    name: 'System User',
    roles: ['leadership_system_admin', 'pm_ops'] as Role[],
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

/** Create a new mobilization. Project must be at forecasting_active or execution_active. */
export async function createMobilizationAction(
  input: Record<string, unknown>,
): Promise<ActionResult<Mobilization>> {
  const parsed = createMobilizationSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()

  // Gate: project must exist and be in valid state
  const project = projectDb.getProject(parsed.data.linked_project_id)
  if (!project) {
    return { success: false, error: 'Linked project not found' }
  }
  if (project.status !== 'forecasting_active' && project.status !== 'execution_active') {
    return {
      success: false,
      error: `Project must be at forecasting_active or execution_active to create a mobilization. Current: ${project.status}`,
    }
  }

  const mobilization = mobilizationDb.createMobilization(
    parsed.data as Omit<Mobilization, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state' | 'reference_id' | 'status'>,
    actor.id,
  )

  return { success: true, data: mobilization }
}

/** Update mobilization fields (planning data). */
export async function updateMobilizationFieldsAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Mobilization>> {
  const parsed = updateMobilizationSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
  const actor = getCurrentActor()
  const updated = mobilizationDb.updateMobilization(id, changes, actor.id)
  return { success: true, data: updated }
}

/** Update readiness checklist. */
export async function updateReadinessChecklistAction(
  input: Record<string, unknown>,
): Promise<ActionResult<Mobilization>> {
  const parsed = updateReadinessChecklistSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()
  const updated = mobilizationDb.updateMobilization(
    parsed.data.mobilization_id,
    { readiness_checklist: parsed.data.checklist },
    actor.id,
    'Readiness checklist updated',
  )
  return { success: true, data: updated }
}

/** Add a daily report. */
export async function addDailyReportAction(
  input: Record<string, unknown>,
): Promise<ActionResult<Mobilization>> {
  const parsed = addDailyReportSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()
  const existing = mobilizationDb.getMobilization(parsed.data.mobilization_id)
  if (!existing) {
    return { success: false, error: 'Mobilization not found' }
  }

  const newReport = {
    date: parsed.data.date,
    summary: parsed.data.summary,
    photos: parsed.data.photos,
    exceptions: parsed.data.exceptions,
    submitted_by: actor.id,
  }

  const updated = mobilizationDb.updateMobilization(
    parsed.data.mobilization_id,
    { daily_reports: [...existing.daily_reports, newReport] },
    actor.id,
    `Daily report added for ${parsed.data.date}`,
  )
  return { success: true, data: updated }
}

/** Transition mobilization status with gate validation. */
export async function transitionMobilizationAction(
  input: Record<string, unknown>,
): Promise<ActionResult<Mobilization>> {
  const parsed = mobilizationTransitionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { mobilization_id, target_status, reason, approval_granted } = parsed.data
  const actor = getCurrentActor()

  const mobilization = mobilizationDb.getMobilization(mobilization_id)
  if (!mobilization) {
    return { success: false, error: 'Mobilization not found' }
  }

  const entityForValidation = { ...mobilization } as Record<string, unknown>

  const result = validateTransition(mobilizationStateMachine, {
    currentState: mobilization.status,
    targetState: target_status,
    entity: entityForValidation,
    actorRoles: actor.roles,
    reason,
    approvalGranted: approval_granted,
  })

  if (!result.allowed) {
    return { success: false, error: result.errors.join(' ') }
  }

  const changes: Partial<Omit<Mobilization, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>> = {
    status: target_status as MobilizationState,
  }

  const updated = mobilizationDb.updateMobilization(
    mobilization_id,
    changes,
    actor.id,
    reason ?? `Status changed to ${MOBILIZATION_STATE_LABELS[target_status as MobilizationState] ?? target_status}`,
  )

  return { success: true, data: updated }
}

/** Compressed planning override: allow ready transition with incomplete checklist + Leadership approval. */
export async function compressedPlanningOverrideAction(
  input: Record<string, unknown>,
): Promise<ActionResult<Mobilization>> {
  const parsed = compressedPlanningOverrideSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()
  if (!actor.roles.includes('leadership_system_admin')) {
    return { success: false, error: 'Compressed planning override requires Leadership approval.' }
  }

  const existing = mobilizationDb.getMobilization(parsed.data.mobilization_id)
  if (!existing) {
    return { success: false, error: 'Mobilization not found' }
  }

  const updated = mobilizationDb.updateMobilization(
    parsed.data.mobilization_id,
    {
      compressed_planning: true,
      exception_flag: true,
    },
    actor.id,
    `Compressed planning override: ${parsed.data.reason}`,
  )

  return { success: true, data: updated }
}

export async function getMobilizationAction(id: string): Promise<ActionResult<Mobilization>> {
  const mobilization = mobilizationDb.getMobilization(id)
  if (!mobilization) {
    return { success: false, error: 'Mobilization not found' }
  }
  return { success: true, data: mobilization }
}

export async function listMobilizationsAction(): Promise<ActionResult<Mobilization[]>> {
  const mobilizations = mobilizationDb.listMobilizations()
  return { success: true, data: mobilizations }
}

export async function listMobilizationsByProjectAction(projectId: string): Promise<ActionResult<Mobilization[]>> {
  const mobilizations = mobilizationDb.listMobilizationsByProject(projectId)
  return { success: true, data: mobilizations }
}

export async function getMobilizationAuditAction(mobilizationId: string) {
  const log = mobilizationDb.getMobilizationAuditLog(mobilizationId)
  return { success: true, data: log }
}
