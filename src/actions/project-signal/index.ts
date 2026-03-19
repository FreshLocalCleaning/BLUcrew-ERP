'use server'

import { createProjectSignalSchema, updateProjectSignalSchema, projectSignalTransitionSchema } from '@/lib/validations/project-signal'
import * as signalDb from '@/lib/db/project-signals'
import { getClient } from '@/lib/db/clients'
import { getContact } from '@/lib/db/contacts'
import { validateTransition } from '@/lib/state-machines/engine'
import { projectSignalStateMachine, PROJECT_SIGNAL_STATE_LABELS } from '@/lib/state-machines/project-signal'
import type { ProjectSignal } from '@/types/commercial'
import type { ProjectSignalState } from '@/lib/state-machines/project-signal'
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

export async function createProjectSignalAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<ProjectSignal>> {
  const parsed = createProjectSignalSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()

  // Resolve client name for denormalization
  const client = getClient(parsed.data.linked_client_id)
  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  // Resolve contact name if provided
  let linkedContactName: string | undefined
  if (parsed.data.linked_contact_id) {
    const contact = getContact(parsed.data.linked_contact_id)
    if (contact) {
      linkedContactName = `${contact.first_name} ${contact.last_name}`
    }
  }

  const signal = signalDb.createProjectSignal(
    {
      ...parsed.data,
      linked_client_name: client.name,
      linked_contact_name: linkedContactName,
      timing_signal: parsed.data.timing_signal ?? null,
      fit_risk_note: parsed.data.fit_risk_note ?? null,
      owner: actor.id,
      next_action: parsed.data.next_action ?? null,
      next_action_date: parsed.data.next_action_date ?? null,
    },
    actor.id,
  )
  return { success: true, data: signal }
}

export async function updateProjectSignalAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<ProjectSignal>> {
  const parsed = updateProjectSignalSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
  const actor = getCurrentActor()
  const signal = signalDb.updateProjectSignal(id, changes, actor.id)
  return { success: true, data: signal }
}

export async function transitionProjectSignalAction(
  input: Record<string, unknown>,
): Promise<ActionResult<ProjectSignal>> {
  const parsed = projectSignalTransitionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { signal_id, target_state, reason, approval_granted } = parsed.data
  const actor = getCurrentActor()

  const signal = signalDb.getProjectSignal(signal_id)
  if (!signal) {
    return { success: false, error: 'Project signal not found' }
  }

  const result = validateTransition(projectSignalStateMachine, {
    currentState: signal.status,
    targetState: target_state,
    entity: signal as unknown as Record<string, unknown>,
    actorRoles: actor.roles,
    reason,
    approvalGranted: approval_granted,
  })

  if (!result.allowed) {
    return { success: false, error: result.errors.join(' ') }
  }

  // Build changes
  const changes: Partial<Omit<ProjectSignal, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>> = {
    status: target_state as ProjectSignalState,
  }

  // Update gate outcome to match state
  if (target_state === 'passed') {
    changes.gate_outcome = 'passed'
    changes.gate_decision_by = actor.id
    changes.gate_decision_date = new Date().toISOString()
  } else if (target_state === 'failed') {
    changes.gate_outcome = 'failed'
    changes.gate_decision_by = actor.id
    changes.gate_decision_date = new Date().toISOString()
  } else if (target_state === 'deferred') {
    changes.gate_outcome = 'deferred'
    changes.gate_decision_by = actor.id
    changes.gate_decision_date = new Date().toISOString()
  }

  const updated = signalDb.updateProjectSignal(
    signal_id,
    changes,
    actor.id,
    reason ?? `Status changed to ${PROJECT_SIGNAL_STATE_LABELS[target_state as ProjectSignalState] ?? target_state}`,
  )

  return { success: true, data: updated }
}

export async function getProjectSignalAction(id: string): Promise<ActionResult<ProjectSignal>> {
  const signal = signalDb.getProjectSignal(id)
  if (!signal) {
    return { success: false, error: 'Project signal not found' }
  }
  return { success: true, data: signal }
}

export async function listProjectSignalsAction(): Promise<ActionResult<ProjectSignal[]>> {
  const signals = signalDb.listProjectSignals()
  return { success: true, data: signals }
}

export async function getProjectSignalAuditAction(signalId: string) {
  const log = signalDb.getProjectSignalAuditLog(signalId)
  return { success: true, data: log }
}
