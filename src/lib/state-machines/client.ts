/**
 * Client State Machine
 *
 * Pure logic — no database dependency.
 * ERP-13 Client lifecycle — 6 states only:
 *   Watchlist → Target Client → Developing Relationship →
 *   Active Client → Dormant → Archived
 *
 * Preferred-Provider Candidate is a TAG on Active Client, not a state.
 */

import type { StateMachineDef } from './engine'

// ---------------------------------------------------------------------------
// Client States (ERP-13 Table 9)
// ---------------------------------------------------------------------------

export const CLIENT_STATES = [
  'watchlist',
  'target_client',
  'developing_relationship',
  'active_client',
  'dormant',
  'archived',
] as const

export type ClientState = (typeof CLIENT_STATES)[number]

export const CLIENT_STATE_LABELS: Record<ClientState, string> = {
  watchlist: 'Watchlist',
  target_client: 'Target Client',
  developing_relationship: 'Developing Relationship',
  active_client: 'Active Client',
  dormant: 'Dormant',
  archived: 'Archived',
}

// ---------------------------------------------------------------------------
// Machine Definition (ERP-13)
// ---------------------------------------------------------------------------

export const clientStateMachine: StateMachineDef<ClientState> = {
  entityType: 'client',
  states: CLIENT_STATES,
  initialState: 'watchlist',
  terminalStates: ['archived'],
  transitions: [
    // --- From Watchlist ---
    {
      fromStates: ['watchlist'],
      toState: 'target_client',
      requiredFields: ['tier', 'vertical'],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['notify_bd_owner'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Promote to Target',
    },
    {
      fromStates: ['watchlist'],
      toState: 'archived',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'APPROVER'],
      sideEffects: ['log_archive'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Archive from Watchlist',
    },

    // --- From Target Client ---
    {
      fromStates: ['target_client'],
      toState: 'developing_relationship',
      requiredFields: ['next_action', 'contacts'],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['create_pursuit_prompt'],
      blockers: [
        (entity) => {
          const contacts = entity['contacts']
          if (Array.isArray(contacts) && contacts.length > 0) return null
          return 'At least one contact is required to move to Developing Relationship.'
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Begin Developing Relationship',
    },
    {
      fromStates: ['target_client'],
      toState: 'archived',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'APPROVER'],
      sideEffects: ['log_archive'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Archive',
    },

    // --- From Developing Relationship ---
    {
      fromStates: ['developing_relationship'],
      toState: 'active_client',
      requiredFields: ['won_award_id'],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['notify_ops_new_customer'],
      blockers: [
        (entity) => {
          if (entity['won_award_id']) return null
          return 'A won award is required to promote to Active Client.'
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Promote to Active Client',
    },
    {
      fromStates: ['developing_relationship'],
      toState: 'dormant',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['schedule_dormant_review'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Mark Dormant',
    },
    {
      fromStates: ['developing_relationship'],
      toState: 'archived',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'APPROVER'],
      sideEffects: ['log_archive'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Archive',
    },

    // --- From Active Client ---
    {
      fromStates: ['active_client'],
      toState: 'dormant',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['schedule_dormant_review'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Mark Dormant',
    },
    {
      fromStates: ['active_client'],
      toState: 'archived',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'APPROVER'],
      sideEffects: ['log_archive'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Archive',
    },

    // --- From Dormant ---
    {
      fromStates: ['dormant'],
      toState: 'target_client',
      requiredFields: ['next_action'],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['notify_bd_reactivation'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Reactivate as Target',
    },
    {
      fromStates: ['dormant'],
      toState: 'developing_relationship',
      requiredFields: ['next_action'],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['notify_bd_reactivation'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Reactivate as Developing',
    },
    {
      fromStates: ['dormant'],
      toState: 'archived',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'APPROVER'],
      sideEffects: ['log_archive'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Archive',
    },

    // --- From Archived (admin reactivation only) ---
    {
      fromStates: ['archived'],
      toState: 'watchlist',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD'],
      sideEffects: ['log_reopen'],
      blockers: [],
      requiresApproval: true,
      requiresReason: true,
      label: 'Reactivate to Watchlist',
    },
  ],
}
