'use server'

import { createClientSchema, updateClientSchema, clientTransitionSchema } from '@/lib/validations/client'
import * as clientDb from '@/lib/db/clients'
import * as db from '@/lib/db/json-db'
import { validateTransition } from '@/lib/state-machines/engine'
import { clientStateMachine, CLIENT_STATE_LABELS } from '@/lib/state-machines/client'
import type { Client } from '@/types/commercial'
import type { ClientState } from '@/lib/state-machines/client'
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

export async function createClientAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Client>> {
  const parsed = createClientSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const actor = getCurrentActor()
  const client = clientDb.createClient(parsed.data, actor.id)
  return { success: true, data: client }
}

export async function updateClientAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<Client>> {
  const parsed = updateClientSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
  const actor = getCurrentActor()
  const client = clientDb.updateClient(id, changes, actor.id)
  return { success: true, data: client }
}

export async function transitionClientAction(
  input: Record<string, unknown>,
): Promise<ActionResult<Client>> {
  const parsed = clientTransitionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { client_id, target_state, reason, approval_granted } = parsed.data
  const actor = getCurrentActor()

  // Load current client
  const client = clientDb.getClient(client_id)
  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  // Validate transition
  const result = validateTransition(clientStateMachine, {
    currentState: client.status,
    targetState: target_state,
    entity: client as unknown as Record<string, unknown>,
    actorRoles: actor.roles,
    reason,
    approvalGranted: approval_granted,
  })

  if (!result.allowed) {
    return { success: false, error: result.errors.join(' ') }
  }

  // Apply transition
  const updated = clientDb.updateClient(
    client_id,
    { status: target_state as ClientState },
    actor.id,
    reason ?? `Status changed to ${CLIENT_STATE_LABELS[target_state as ClientState] ?? target_state}`,
  )

  // Log the transition in audit
  const dbInstance = db.getById<Client>('clients', client_id)
  void dbInstance // transition logged via update

  return { success: true, data: updated }
}

export async function getClientAction(id: string): Promise<ActionResult<Client>> {
  const client = clientDb.getClient(id)
  if (!client) {
    return { success: false, error: 'Client not found' }
  }
  return { success: true, data: client }
}

export async function listClientsAction(): Promise<ActionResult<Client[]>> {
  const clients = clientDb.listClients()
  return { success: true, data: clients }
}

export async function getClientAuditAction(clientId: string) {
  const log = clientDb.getClientAuditLog(clientId)
  return { success: true, data: log }
}
