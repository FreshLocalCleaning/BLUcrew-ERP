/**
 * Client State Machine
 *
 * Pure logic — no database dependency.
 * States from BLU Crew operating system:
 *   Watchlist → Target Client → Developing Relationship →
 *   Active Customer → Strategic/Preferred Candidate → Dormant → Archived
 */

import type { StateMachineDef } from './engine'

// ---------------------------------------------------------------------------
// Client States
// ---------------------------------------------------------------------------

export const CLIENT_STATES = [
  'watchlist',
  'target_client',
  'developing_relationship',
  'active_customer',
  'strategic_preferred',
  'dormant',
  'archived',
] as const

export type ClientState = (typeof CLIENT_STATES)[number]

export const CLIENT_STATE_LABELS: Record<ClientState, string> = {
  watchlist: 'Watchlist',
  target_client: 'Target Client',
  developing_relationship: 'Developing Relationship',
  active_customer: 'Active Customer',
  strategic_preferred: 'Strategic/Preferred Candidate',
  dormant: 'Dormant',
  archived: 'Archived',
}

// ---------------------------------------------------------------------------
// Machine Definition
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
      toState: 'active_customer',
      requiredFields: ['won_award_id'],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['notify_ops_new_customer'],
      blockers: [
        (entity) => {
          if (entity['won_award_id']) return null
          return 'A won award is required to promote to Active Customer.'
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Promote to Active Customer',
    },
    {
      fromStates: ['developing_relationship'],
      toState: 'strategic_preferred',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'APPROVER'],
      sideEffects: ['notify_leadership_strategic'],
      blockers: [],
      requiresApproval: true,
      requiresReason: false,
      label: 'Elevate to Strategic/Preferred',
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

    // --- From Active Customer ---
    {
      fromStates: ['active_customer'],
      toState: 'strategic_preferred',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'APPROVER'],
      sideEffects: ['notify_leadership_strategic'],
      blockers: [],
      requiresApproval: true,
      requiresReason: false,
      label: 'Elevate to Strategic/Preferred',
    },
    {
      fromStates: ['active_customer'],
      toState: 'dormant',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['schedule_dormant_review'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Mark Dormant',
    },

    // --- From Strategic/Preferred ---
    {
      fromStates: ['strategic_preferred'],
      toState: 'dormant',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'APPROVER'],
      sideEffects: ['notify_leadership_strategic_change'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Mark Dormant',
    },
    {
      fromStates: ['strategic_preferred'],
      toState: 'active_customer',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'APPROVER'],
      sideEffects: ['notify_leadership_strategic_change'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Demote to Active Customer',
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

    // --- From Archived (leadership reopen only) ---
    {
      fromStates: ['archived'],
      toState: 'watchlist',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD'],
      sideEffects: ['log_reopen'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Reopen to Watchlist',
    },
  ],
}
