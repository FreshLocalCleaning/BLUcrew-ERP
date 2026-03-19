'use server'

import {
  updateProjectSchema,
  projectTransitionSchema,
} from '@/lib/validations/project'
import * as projectDb from '@/lib/db/projects'
import * as mobilizationDb from '@/lib/db/mobilizations'
import { validateTransition } from '@/lib/state-machines/engine'
import {
  projectStateMachine,
  PROJECT_STATE_LABELS,
} from '@/lib/state-machines/project'
import type { Project } from '@/types/commercial'
import type { ProjectState } from '@/lib/state-machines/project'
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

/** Transition project status. */
export async function transitionProjectAction(
  input: Record<string, unknown>,
): Promise<ActionResult<Project>> {
  const parsed = projectTransitionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { project_id, target_status, reason, approval_granted } = parsed.data
  const actor = getCurrentActor()

  const project = projectDb.getProject(project_id)
  if (!project) {
    return { success: false, error: 'Project not found' }
  }

  // Compute mobilization counts for state machine gate validation
  const mobilizations = mobilizationDb.listMobilizationsByProject(project_id)
  const openMobs = mobilizations.filter(
    (m) => m.status !== 'complete' && m.status !== 'cancelled',
  )

  const entityForValidation = {
    ...project,
    mobilization_count: mobilizations.length,
    open_mobilization_count: openMobs.length,
  } as Record<string, unknown>

  const result = validateTransition(projectStateMachine, {
    currentState: project.status,
    targetState: target_status,
    entity: entityForValidation,
    actorRoles: actor.roles,
    reason,
    approvalGranted: approval_granted,
  })

  if (!result.allowed) {
    return { success: false, error: result.errors.join(' ') }
  }

  const changes: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>> = {
    status: target_status as ProjectState,
  }

  const updated = projectDb.updateProject(
    project_id,
    changes,
    actor.id,
    reason ?? `Status changed to ${PROJECT_STATE_LABELS[target_status as ProjectState] ?? target_status}`,
  )

  return { success: true, data: updated }
}

/** Update project fields. */
export async function updateProjectAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Project>> {
  const parsed = updateProjectSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
  const actor = getCurrentActor()
  const updated = projectDb.updateProject(id, changes, actor.id)
  return { success: true, data: updated }
}

export async function getProjectAction(id: string): Promise<ActionResult<Project>> {
  const project = projectDb.getProject(id)
  if (!project) {
    return { success: false, error: 'Project not found' }
  }
  return { success: true, data: project }
}

export async function listProjectsAction(): Promise<ActionResult<Project[]>> {
  const projects = projectDb.listProjects()
  return { success: true, data: projects }
}

export async function getProjectAuditAction(projectId: string) {
  const log = projectDb.getProjectAuditLog(projectId)
  return { success: true, data: log }
}
