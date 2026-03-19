'use server'

import {
  createChangeOrderSchema,
  updateChangeOrderSchema,
  changeOrderTransitionSchema,
} from '@/lib/validations/change-order'
import * as changeOrderDb from '@/lib/db/change-orders'
import * as projectDb from '@/lib/db/projects'
import { validateTransition } from '@/lib/state-machines/engine'
import { dispatchEvent } from '@/lib/integrations/event-bus'
import {
  changeOrderStateMachine,
  CHANGE_ORDER_STATE_LABELS,
} from '@/lib/state-machines/change-order'
import type { ChangeOrder } from '@/types/commercial'
import type { ChangeOrderState } from '@/lib/state-machines/change-order'
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

/** Create a new change order. Project must be at forecasting_active, execution_active, or operationally_complete. */
export async function createChangeOrderAction(
  input: Record<string, unknown>,
): Promise<ActionResult<ChangeOrder>> {
  const parsed = createChangeOrderSchema.safeParse(input)
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
  const validStates = ['forecasting_active', 'execution_active', 'operationally_complete']
  if (!validStates.includes(project.status)) {
    return {
      success: false,
      error: `Project must be at forecasting_active, execution_active, or operationally_complete to create a change order. Current: ${project.status}`,
    }
  }

  const changeOrder = changeOrderDb.createChangeOrder(
    parsed.data as Omit<ChangeOrder, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state' | 'reference_id' | 'status'>,
    actor.id,
  )

  return { success: true, data: changeOrder }
}

/** Update change order fields. */
export async function updateChangeOrderFieldsAction(
  formData: Record<string, unknown>,
): Promise<ActionResult<ChangeOrder>> {
  const parsed = updateChangeOrderSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { id, ...changes } = parsed.data
  const actor = getCurrentActor()
  const updated = changeOrderDb.updateChangeOrder(
    id,
    changes as Partial<Omit<ChangeOrder, keyof import('@/lib/db/json-db').BaseEntity>>,
    actor.id,
  )
  return { success: true, data: updated }
}

/** Transition change order status with gate validation. */
export async function transitionChangeOrderAction(
  input: Record<string, unknown>,
): Promise<ActionResult<ChangeOrder>> {
  const parsed = changeOrderTransitionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validation failed' }
  }

  const { change_order_id, target_status, reason, approval_granted } = parsed.data
  const actor = getCurrentActor()

  const changeOrder = changeOrderDb.getChangeOrder(change_order_id)
  if (!changeOrder) {
    return { success: false, error: 'Change order not found' }
  }

  const entityForValidation = { ...changeOrder } as Record<string, unknown>

  const result = validateTransition(changeOrderStateMachine, {
    currentState: changeOrder.status,
    targetState: target_status,
    entity: entityForValidation,
    actorRoles: actor.roles,
    reason,
    approvalGranted: approval_granted,
  })

  if (!result.allowed) {
    return { success: false, error: result.errors.join(' ') }
  }

  const changes: Partial<Omit<ChangeOrder, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archive_state'>> = {
    status: target_status as ChangeOrderState,
  }

  // Side effect: update active_change_order_count on project when status changes
  const updated = changeOrderDb.updateChangeOrder(
    change_order_id,
    changes,
    actor.id,
    reason ?? `Status changed to ${CHANGE_ORDER_STATE_LABELS[target_status as ChangeOrderState] ?? target_status}`,
  )

  // Update project's active_change_order_count
  const allProjectCOs = changeOrderDb.listChangeOrdersByProject(changeOrder.linked_project_id)
  const activeCount = allProjectCOs.filter(
    (co) => !['closed', 'rejected'].includes(co.status),
  ).length
  projectDb.updateProject(
    changeOrder.linked_project_id,
    { active_change_order_count: activeCount },
    actor.id,
    `Active CO count updated to ${activeCount}`,
  )

  return { success: true, data: updated }
}

/** Send a draft CO to estimating: transitions draft → internal_review and dispatches notification. */
export async function sendToEstimatingAction(
  input: { change_order_id: string },
): Promise<ActionResult<ChangeOrder>> {
  const actor = getCurrentActor()
  const changeOrder = changeOrderDb.getChangeOrder(input.change_order_id)
  if (!changeOrder) {
    return { success: false, error: 'Change order not found' }
  }

  if (changeOrder.status !== 'draft') {
    return { success: false, error: `Cannot send to estimating — CO is in "${changeOrder.status}", must be in "draft".` }
  }

  // Validate transition
  const result = validateTransition(changeOrderStateMachine, {
    currentState: changeOrder.status,
    targetState: 'internal_review',
    entity: { ...changeOrder } as Record<string, unknown>,
    actorRoles: actor.roles,
    reason: 'Sent to Estimating for pricing',
    approvalGranted: true,
  })

  if (!result.allowed) {
    return { success: false, error: result.errors.join(' ') }
  }

  const updated = changeOrderDb.updateChangeOrder(
    input.change_order_id,
    { status: 'internal_review' as ChangeOrderState },
    actor.id,
    'Sent to Estimating for pricing',
  )

  // Dispatch integration event
  dispatchEvent({
    event_type: 'change_order.sent_to_estimating.v1',
    source_entity: 'change_orders',
    source_id: input.change_order_id,
    target_system: 'teams',
    payload: {
      reference_id: changeOrder.reference_id,
      scope_delta: changeOrder.scope_delta,
      linked_project_id: changeOrder.linked_project_id,
      linked_client_id: changeOrder.linked_client_id,
      fact_packet_by: changeOrder.fact_packet_by,
    },
  })

  return { success: true, data: updated }
}

export async function getChangeOrderAction(id: string): Promise<ActionResult<ChangeOrder>> {
  const changeOrder = changeOrderDb.getChangeOrder(id)
  if (!changeOrder) {
    return { success: false, error: 'Change order not found' }
  }
  return { success: true, data: changeOrder }
}

export async function listChangeOrdersAction(): Promise<ActionResult<ChangeOrder[]>> {
  const changeOrders = changeOrderDb.listChangeOrders()
  return { success: true, data: changeOrders }
}

export async function listChangeOrdersByProjectAction(projectId: string): Promise<ActionResult<ChangeOrder[]>> {
  const changeOrders = changeOrderDb.listChangeOrdersByProject(projectId)
  return { success: true, data: changeOrders }
}

export async function getChangeOrderAuditAction(changeOrderId: string) {
  const log = changeOrderDb.getChangeOrderAuditLog(changeOrderId)
  return { success: true, data: log }
}
