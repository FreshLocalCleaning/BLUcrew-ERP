/**
 * Change Order State Machine
 *
 * Pure logic — no database dependency.
 * ERP-13: Change Order lifecycle — post-award scope revision.
 *
 * 7 states:
 *   draft → internal_review → client_pending → approved → released → closed
 *   + rejected (reachable from client_pending, reopenable to draft)
 *   + internal_review → draft (return for rework)
 *
 * Terminal: closed
 *
 * Rule: PM creates fact packet; BD/Estimating prices; PM never self-approves price.
 * Rule: Changed work never overwrites the original sold baseline.
 */

import type { StateMachineDef } from './engine'

// ---------------------------------------------------------------------------
// Change Order States (ERP-13)
// ---------------------------------------------------------------------------

export const CHANGE_ORDER_STATES = [
  'draft',
  'internal_review',
  'client_pending',
  'approved',
  'rejected',
  'released',
  'closed',
] as const

export type ChangeOrderState = (typeof CHANGE_ORDER_STATES)[number]

export const CHANGE_ORDER_STATE_LABELS: Record<ChangeOrderState, string> = {
  draft: 'Draft',
  internal_review: 'Internal Review',
  client_pending: 'Client Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  released: 'Released',
  closed: 'Closed',
}

// ---------------------------------------------------------------------------
// Machine Definition (ERP-13)
// ---------------------------------------------------------------------------

export const changeOrderStateMachine: StateMachineDef<ChangeOrderState> = {
  entityType: 'change_order',
  states: CHANGE_ORDER_STATES,
  initialState: 'draft',
  terminalStates: ['closed'],
  transitions: [
    // --- draft → internal_review ---
    {
      fromStates: ['draft'],
      toState: 'internal_review',
      requiredFields: ['scope_delta', 'fact_packet_by'],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_internal_review'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Submit for Internal Review',
    },

    // --- internal_review → client_pending ---
    {
      fromStates: ['internal_review'],
      toState: 'client_pending',
      requiredFields: ['pricing_delta', 'priced_by'],
      requiredRoles: ['leadership_system_admin', 'commercial_bd', 'estimating'],
      sideEffects: ['notify_client_pending'],
      blockers: [
        (entity) => {
          // PM never self-approves price: priced_by must differ from fact_packet_by
          const pricedBy = entity['priced_by'] as string | null
          const factBy = entity['fact_packet_by'] as string | null
          if (pricedBy && factBy && pricedBy === factBy) {
            return 'PM who documented facts cannot also price the change order. Estimating or Commercial/BD must price it.'
          }
          return null
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Send to Client',
    },

    // --- internal_review → draft (return for rework) ---
    {
      fromStates: ['internal_review'],
      toState: 'draft',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'estimating'],
      sideEffects: ['notify_rework'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Return for Rework',
    },

    // --- client_pending → approved ---
    {
      fromStates: ['client_pending'],
      toState: 'approved',
      requiredFields: ['client_response_date'],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_approved'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark Approved by Client',
    },

    // --- client_pending → rejected ---
    {
      fromStates: ['client_pending'],
      toState: 'rejected',
      requiredFields: ['rejection_reason'],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_rejected'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark Rejected by Client',
    },

    // --- approved → released ---
    {
      fromStates: ['approved'],
      toState: 'released',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['update_billing_references', 'notify_released'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Release to Project',
    },

    // --- released → closed ---
    {
      fromStates: ['released'],
      toState: 'closed',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'admin_finance'],
      sideEffects: ['notify_closed'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Close (Commercially Settled)',
    },

    // --- rejected → draft (rework for resubmission) ---
    {
      fromStates: ['rejected'],
      toState: 'draft',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_reopen'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Reopen for Rework',
    },
  ],
}
