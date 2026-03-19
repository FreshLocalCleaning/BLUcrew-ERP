'use server'

import {
  createExpansionTaskSchema,
  updateExpansionTaskSchema,
  expansionTaskTransitionSchema,
} from '@/lib/validations/expansion-task'
import * as expansionTaskDb from '@/lib/db/expansion-tasks'
import * as projectDb from '@/lib/db/projects'
import { validateTransition } from '@/lib/state-machines/engine'
import {
  expansionTaskStateMachine,
  EXPANSION_TASK_STATE_LABELS,
} from '@/lib/state-machines/expansion-task'
import type { ExpansionTask } from '@/types/commercial'
import type { ExpansionTaskState } from '@/lib/state-machines/expansion-task'
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

/** Create a new expansion task for a project. */
export async function createExpansionTaskAction(
  input: Record<string, unknown>,
): Promise<ActionResult<ExpansionTask>> {
  const parsed = createExpansionTaskSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()

  // Gate: project must exist
  const project = projectDb.getProject(parsed.data.linked_project_id)
  if (!project) {
    return { success: false, error: 'Linked project not found' }
  }

  const expansionTask = expansionTaskDb.createExpansionTask(
    parsed.data as Omit<ExpansionTask, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state' | 'reference_id' | 'status'>,
    actor.id,
  )

  return { success: true, data: expansionTask }
}

/** Auto-create an expansion task when a project reaches operationally_complete. */
export async function autoCreateExpansionTaskAction(
  projectId: string,
): Promise<ActionResult<ExpansionTask>> {
  const project = projectDb.getProject(projectId)
  if (!project) {
    return { success: false, error: 'Project not found' }
  }

  // Check if an expansion task already exists for this project
  const existing = expansionTaskDb.listExpansionTasksByProject(projectId)
  if (existing.length > 0) {
    return { success: true, data: existing[0] }
  }

  const expansionTask = expansionTaskDb.createExpansionTask(
    {
      linked_project_id: projectId,
      linked_client_id: project.linked_client_id,
      task_type: 'thank_you',
      growth_objective: `Send thank-you to client for ${project.project_name}. Review expansion opportunities.`,
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
      referral_status: null,
      testimonial_status: null,
      next_signal_created: false,
      next_signal_id: null,
      completion_outcome: null,
      owner: project.pm_owner_id,
      next_action: 'Send thank-you and assess growth opportunities',
      next_action_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
    } as Omit<ExpansionTask, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state' | 'reference_id' | 'status'>,
    'system',
  )

  return { success: true, data: expansionTask }
}

/** Update expansion task fields. */
export async function updateExpansionTaskFieldsAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<ExpansionTask>> {
  const parsed = updateExpansionTaskSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
  const actor = getCurrentActor()
  const updated = expansionTaskDb.updateExpansionTask(id, changes, actor.id)
  return { success: true, data: updated }
}

/** Transition expansion task status with gate validation. */
export async function transitionExpansionTaskAction(
  input: Record<string, unknown>,
): Promise<ActionResult<ExpansionTask>> {
  const parsed = expansionTaskTransitionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { expansion_task_id, target_status, reason, approval_granted } = parsed.data
  const actor = getCurrentActor()

  const expansionTask = expansionTaskDb.getExpansionTask(expansion_task_id)
  if (!expansionTask) {
    return { success: false, error: 'Expansion task not found' }
  }

  const entityForValidation = { ...expansionTask } as Record<string, unknown>

  const result = validateTransition(expansionTaskStateMachine, {
    currentState: expansionTask.status,
    targetState: target_status,
    entity: entityForValidation,
    actorRoles: actor.roles,
    reason,
    approvalGranted: approval_granted,
  })

  if (!result.allowed) {
    return { success: false, error: result.errors.join(' ') }
  }

  const changes: Partial<Omit<ExpansionTask, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>> = {
    status: target_status as ExpansionTaskState,
  }

  const updated = expansionTaskDb.updateExpansionTask(
    expansion_task_id,
    changes,
    actor.id,
    reason ?? `Status changed to ${EXPANSION_TASK_STATE_LABELS[target_status as ExpansionTaskState] ?? target_status}`,
  )

  return { success: true, data: updated }
}

export async function getExpansionTaskAction(id: string): Promise<ActionResult<ExpansionTask>> {
  const expansionTask = expansionTaskDb.getExpansionTask(id)
  if (!expansionTask) {
    return { success: false, error: 'Expansion task not found' }
  }
  return { success: true, data: expansionTask }
}

export async function listExpansionTasksAction(): Promise<ActionResult<ExpansionTask[]>> {
  const expansionTasks = expansionTaskDb.listExpansionTasks()
  return { success: true, data: expansionTasks }
}

export async function listExpansionTasksByProjectAction(projectId: string): Promise<ActionResult<ExpansionTask[]>> {
  const expansionTasks = expansionTaskDb.listExpansionTasksByProject(projectId)
  return { success: true, data: expansionTasks }
}

export async function getExpansionTaskAuditAction(expansionTaskId: string) {
  const log = expansionTaskDb.getExpansionTaskAuditLog(expansionTaskId)
  return { success: true, data: log }
}
