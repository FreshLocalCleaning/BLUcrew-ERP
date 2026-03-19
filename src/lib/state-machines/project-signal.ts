/**
 * Project Signal State Machine
 *
 * Pure logic — no database dependency.
 * ERP-12/13: Pre-pursuit proof that a real project-linked opportunity exists.
 *
 * States: received → under_review → passed | failed | deferred
 * Passed signals enable Pursuit creation.
 */

import type { StateMachineDef } from './engine'

// ---------------------------------------------------------------------------
// Project Signal States
// ---------------------------------------------------------------------------

export const PROJECT_SIGNAL_STATES = [
  'received',
  'under_review',
  'passed',
  'failed',
  'deferred',
] as const

export type ProjectSignalState = (typeof PROJECT_SIGNAL_STATES)[number]

export const PROJECT_SIGNAL_STATE_LABELS: Record<ProjectSignalState, string> = {
  received: 'Received',
  under_review: 'Under Review',
  passed: 'Passed',
  failed: 'Failed',
  deferred: 'Deferred',
}

// ---------------------------------------------------------------------------
// Machine Definition
// ---------------------------------------------------------------------------

export const projectSignalStateMachine: StateMachineDef<ProjectSignalState> = {
  entityType: 'project_signal',
  states: PROJECT_SIGNAL_STATES,
  initialState: 'received',
  terminalStates: [],
  transitions: [
    // --- From Received ---
    {
      fromStates: ['received'],
      toState: 'under_review',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_signal_under_review'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Begin Review',
    },

    // --- From Under Review ---
    {
      fromStates: ['under_review'],
      toState: 'passed',
      requiredFields: ['linked_client_id', 'linked_contact_id', 'project_identity', 'signal_type', 'source_evidence'],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['enable_pursuit_creation'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Pass Signal — Enable Pursuit',
    },
    {
      fromStates: ['under_review'],
      toState: 'failed',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['log_signal_failed'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Fail Signal',
    },
    {
      fromStates: ['under_review'],
      toState: 'deferred',
      requiredFields: ['next_action_date'],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['schedule_deferred_review'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Defer Signal',
    },

    // --- From Deferred ---
    {
      fromStates: ['deferred'],
      toState: 'under_review',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_signal_reopened'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Reopen for Review',
    },

    // --- From Failed (leadership override only) ---
    {
      fromStates: ['failed'],
      toState: 'under_review',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin'],
      sideEffects: ['log_signal_override'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Override — Reopen for Review',
    },
  ],
}
