/**
 * Proposal State Machine
 *
 * Pure logic — no database dependency.
 * ERP-13 Table 12: Proposal status pipeline.
 *
 * 6 statuses:
 *   Delivered → In Review → Hold → Accepted → Rejected → Dormant
 *
 * Key rule: No internal draft/QA on Proposal — that lives on Estimate.
 * Accepted triggers auto-create Award/Handoff shell.
 */

import type { StateMachineDef } from './engine'

// ---------------------------------------------------------------------------
// Proposal Statuses (ERP-13 Table 12)
// ---------------------------------------------------------------------------

export const PROPOSAL_STATUSES = [
  'delivered',
  'in_review',
  'hold',
  'accepted',
  'rejected',
  'dormant',
] as const

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  delivered: 'Delivered',
  in_review: 'In Review',
  hold: 'Hold',
  accepted: 'Accepted',
  rejected: 'Rejected',
  dormant: 'Dormant',
}

// ---------------------------------------------------------------------------
// Machine Definition (ERP-13 Table 12)
// ---------------------------------------------------------------------------

export const proposalStateMachine: StateMachineDef<ProposalStatus> = {
  entityType: 'proposal',
  states: PROPOSAL_STATUSES,
  initialState: 'delivered',
  terminalStates: ['accepted', 'rejected'],
  transitions: [
    // --- Delivered → In Review ---
    // Client is actively reviewing. Decision target date required.
    {
      fromStates: ['delivered'],
      toState: 'in_review',
      requiredFields: ['decision_target_date'],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_proposal_in_review'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark as In Review',
    },

    // --- In Review → Hold ---
    // Decision blocked or intentionally paused. Requires reason + review date.
    {
      fromStates: ['in_review'],
      toState: 'hold',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['log_hold'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Place on Hold',
    },

    // --- In Review → Accepted ---
    // Real commercial yes. Requires acceptance_confirmation_method.
    // Side effect: auto-create Award/Handoff shell.
    {
      fromStates: ['in_review'],
      toState: 'accepted',
      requiredFields: ['acceptance_confirmation_method'],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['auto_create_award_handoff', 'notify_proposal_accepted'],
      blockers: [
        (entity) => {
          if (entity['acceptance_confirmation_method']) return null
          return 'Acceptance confirmation method is required (email, verbal, signed_document, or purchase_order).'
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark as Accepted',
    },

    // --- In Review → Rejected ---
    // Commercial no. Reason required.
    {
      fromStates: ['in_review'],
      toState: 'rejected',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_proposal_rejected', 'log_rejection_reason'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Mark as Rejected',
    },

    // --- In Review → Dormant ---
    // No active motion for now.
    {
      fromStates: ['in_review'],
      toState: 'dormant',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['log_dormant'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Mark Dormant',
    },

    // --- Hold → In Review ---
    // Unblocked. Requires next action date.
    {
      fromStates: ['hold'],
      toState: 'in_review',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_hold_released'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Resume Review',
    },

    // --- Hold → Rejected ---
    {
      fromStates: ['hold'],
      toState: 'rejected',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_proposal_rejected', 'log_rejection_reason'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Reject from Hold',
    },

    // --- Hold → Dormant ---
    {
      fromStates: ['hold'],
      toState: 'dormant',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['log_dormant'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Mark Dormant from Hold',
    },

    // --- Dormant → In Review ---
    // Reactivation requires owner and next action date.
    {
      fromStates: ['dormant'],
      toState: 'in_review',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_proposal_reactivated'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Reactivate to In Review',
    },

    // --- Dormant → Rejected ---
    {
      fromStates: ['dormant'],
      toState: 'rejected',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_proposal_rejected', 'log_rejection_reason'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Reject from Dormant',
    },
  ],
}
