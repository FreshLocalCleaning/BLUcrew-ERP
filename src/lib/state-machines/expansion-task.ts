/**
 * Expansion Task State Machine
 *
 * Pure logic — no database dependency.
 * ERP-13: Expansion Opportunity lifecycle — post-project growth tracking.
 *
 * 5 states:
 *   open → in_progress → complete
 *   + waiting (reachable from in_progress, returnable to in_progress)
 *   + cancelled (reachable from in_progress, waiting)
 *
 * Terminal: complete, cancelled
 *
 * Rule: Future work becomes a new Project Signal, not a reused Project.
 */

import type { StateMachineDef } from './engine'

// ---------------------------------------------------------------------------
// Expansion Task States (ERP-13)
// ---------------------------------------------------------------------------

export const EXPANSION_TASK_STATES = [
  'open',
  'in_progress',
  'waiting',
  'complete',
  'cancelled',
] as const

export type ExpansionTaskState = (typeof EXPANSION_TASK_STATES)[number]

export const EXPANSION_TASK_STATE_LABELS: Record<ExpansionTaskState, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

// ---------------------------------------------------------------------------
// Machine Definition (ERP-13)
// ---------------------------------------------------------------------------

export const expansionTaskStateMachine: StateMachineDef<ExpansionTaskState> = {
  entityType: 'expansion_task',
  states: EXPANSION_TASK_STATES,
  initialState: 'open',
  terminalStates: ['complete', 'cancelled'],
  transitions: [
    // --- open → in_progress ---
    {
      fromStates: ['open'],
      toState: 'in_progress',
      requiredFields: ['owner', 'due_date'],
      requiredRoles: ['leadership_system_admin', 'commercial_bd', 'pm_ops'],
      sideEffects: ['notify_in_progress'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Start Work',
    },

    // --- in_progress → waiting ---
    {
      fromStates: ['in_progress'],
      toState: 'waiting',
      requiredFields: ['next_action_date'],
      requiredRoles: ['leadership_system_admin', 'commercial_bd', 'pm_ops'],
      sideEffects: ['notify_waiting'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark Waiting',
    },

    // --- in_progress → complete ---
    {
      fromStates: ['in_progress'],
      toState: 'complete',
      requiredFields: ['completion_outcome'],
      requiredRoles: ['leadership_system_admin', 'commercial_bd', 'pm_ops'],
      sideEffects: ['notify_complete'],
      blockers: [
        (entity) => {
          // If next_signal_created is true, verify signal exists
          if (entity['next_signal_created'] === true && !entity['next_signal_id']) {
            return 'Signal is marked as created but no signal ID is linked. Create the signal first.'
          }
          return null
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark Complete',
    },

    // --- in_progress → cancelled ---
    {
      fromStates: ['in_progress'],
      toState: 'cancelled',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_cancelled'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Cancel Task',
    },

    // --- waiting → in_progress ---
    {
      fromStates: ['waiting'],
      toState: 'in_progress',
      requiredFields: ['next_action_date'],
      requiredRoles: ['leadership_system_admin', 'commercial_bd', 'pm_ops'],
      sideEffects: ['notify_resumed'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Resume Work',
    },

    // --- waiting → cancelled ---
    {
      fromStates: ['waiting'],
      toState: 'cancelled',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_cancelled'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Cancel Task',
    },
  ],
}
