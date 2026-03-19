/**
 * Project State Machine
 *
 * Pure logic — no database dependency.
 * ERP-13: Project lifecycle from PM activation through financial close.
 *
 * 7 states:
 *   startup_pending → forecasting_active → execution_active →
 *   operationally_complete → financially_open → financially_closed
 *   + dispute_hold (reachable from operationally_complete or financially_open)
 *
 * Terminal: financially_closed
 */

import type { StateMachineDef } from './engine'

// ---------------------------------------------------------------------------
// Project States (ERP-13)
// ---------------------------------------------------------------------------

export const PROJECT_STATES = [
  'startup_pending',
  'forecasting_active',
  'execution_active',
  'operationally_complete',
  'financially_open',
  'financially_closed',
  'dispute_hold',
] as const

export type ProjectState = (typeof PROJECT_STATES)[number]

export const PROJECT_STATE_LABELS: Record<ProjectState, string> = {
  startup_pending: 'Startup Pending',
  forecasting_active: 'Forecasting Active',
  execution_active: 'Execution Active',
  operationally_complete: 'Operationally Complete',
  financially_open: 'Financially Open',
  financially_closed: 'Financially Closed',
  dispute_hold: 'Dispute Hold',
}

// ---------------------------------------------------------------------------
// Machine Definition (ERP-13)
// ---------------------------------------------------------------------------

export const projectStateMachine: StateMachineDef<ProjectState> = {
  entityType: 'project',
  states: PROJECT_STATES,
  initialState: 'startup_pending',
  terminalStates: ['financially_closed'],
  transitions: [
    // --- startup_pending → forecasting_active ---
    {
      fromStates: ['startup_pending'],
      toState: 'forecasting_active',
      requiredFields: ['pm_owner_id'],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_forecasting_started'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Start Forecasting',
    },

    // --- forecasting_active → execution_active ---
    // At least one mobilization must exist (checked via blocker).
    {
      fromStates: ['forecasting_active'],
      toState: 'execution_active',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_execution_started'],
      blockers: [
        (entity) => {
          const mobCount = entity['mobilization_count'] as number | undefined
          if (!mobCount || mobCount < 1) {
            return 'At least one mobilization must exist before moving to execution.'
          }
          return null
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Start Execution',
    },

    // --- execution_active → operationally_complete ---
    // All mobilizations must be complete or cancelled.
    {
      fromStates: ['execution_active'],
      toState: 'operationally_complete',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_ops_complete', 'create_expansion_task_stub'],
      blockers: [
        (entity) => {
          const openMobs = entity['open_mobilization_count'] as number | undefined
          if (openMobs && openMobs > 0) {
            return `${openMobs} mobilization(s) are still open. All must be complete or cancelled.`
          }
          return null
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark Operationally Complete',
    },

    // --- operationally_complete → financially_open ---
    {
      fromStates: ['operationally_complete'],
      toState: 'financially_open',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'pm_ops', 'admin_finance'],
      sideEffects: ['notify_financially_open'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Open Financials',
    },

    // --- financially_open → financially_closed ---
    {
      fromStates: ['financially_open'],
      toState: 'financially_closed',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'admin_finance'],
      sideEffects: ['notify_financially_closed'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Close Financials',
    },

    // --- operationally_complete → dispute_hold ---
    {
      fromStates: ['operationally_complete'],
      toState: 'dispute_hold',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_dispute_hold'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Place in Dispute Hold',
    },

    // --- financially_open → dispute_hold ---
    {
      fromStates: ['financially_open'],
      toState: 'dispute_hold',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'admin_finance'],
      sideEffects: ['notify_dispute_hold'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Place in Dispute Hold',
    },

    // --- dispute_hold → financially_open ---
    {
      fromStates: ['dispute_hold'],
      toState: 'financially_open',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin'],
      sideEffects: ['notify_dispute_resolved'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Resolve to Financially Open',
    },

    // --- dispute_hold → operationally_complete ---
    {
      fromStates: ['dispute_hold'],
      toState: 'operationally_complete',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin'],
      sideEffects: ['notify_dispute_resolved'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Resolve to Operationally Complete',
    },
  ],
}
