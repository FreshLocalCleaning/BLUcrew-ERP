/**
 * Pursuit State Machine
 *
 * Pure logic — no database dependency.
 * CORE-02: Project pursuit qualification and preconstruction development.
 *
 * Stages:
 *   Project Signal Received → Qualification Underway → Site Walk Scheduled →
 *   Site Walk Complete → Closeout Plan Drafted → Closeout Plan Approved →
 *   Scope Development → Internal Review → Estimate Ready → No Bid
 */

import type { StateMachineDef } from './engine'

// ---------------------------------------------------------------------------
// Pursuit Stages
// ---------------------------------------------------------------------------

export const PURSUIT_STAGES = [
  'project_signal_received',
  'qualification_underway',
  'site_walk_scheduled',
  'site_walk_complete',
  'closeout_plan_drafted',
  'closeout_plan_approved',
  'scope_development',
  'internal_review',
  'estimate_ready',
  'no_bid',
] as const

export type PursuitStage = (typeof PURSUIT_STAGES)[number]

export const PURSUIT_STAGE_LABELS: Record<PursuitStage, string> = {
  project_signal_received: 'Project Signal Received',
  qualification_underway: 'Qualification Underway',
  site_walk_scheduled: 'Site Walk Scheduled',
  site_walk_complete: 'Site Walk Complete',
  closeout_plan_drafted: 'Closeout Plan Drafted',
  closeout_plan_approved: 'Closeout Plan Approved',
  scope_development: 'Scope Development',
  internal_review: 'Internal Review',
  estimate_ready: 'Estimate Ready',
  no_bid: 'No Bid',
}

// The 9 active stages (excluding no_bid) for the stage progression tracker
export const PURSUIT_ACTIVE_STAGES: PursuitStage[] = [
  'project_signal_received',
  'qualification_underway',
  'site_walk_scheduled',
  'site_walk_complete',
  'closeout_plan_drafted',
  'closeout_plan_approved',
  'scope_development',
  'internal_review',
  'estimate_ready',
]

// ---------------------------------------------------------------------------
// Machine Definition
// ---------------------------------------------------------------------------

export const pursuitStateMachine: StateMachineDef<PursuitStage> = {
  entityType: 'pursuit',
  states: PURSUIT_STAGES,
  initialState: 'project_signal_received',
  terminalStates: ['no_bid'],
  transitions: [
    // --- From Project Signal Received ---
    {
      fromStates: ['project_signal_received'],
      toState: 'qualification_underway',
      requiredFields: ['client_id', 'project_name'],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['notify_bd_qualification_started'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Begin Qualification',
    },
    {
      fromStates: ['project_signal_received'],
      toState: 'no_bid',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER'],
      sideEffects: ['log_no_bid'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'No-Bid This Pursuit',
    },

    // --- From Qualification Underway ---
    {
      fromStates: ['qualification_underway'],
      toState: 'site_walk_scheduled',
      requiredFields: ['client_id', 'project_name'],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['notify_site_walk_scheduled'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Schedule Site Walk',
    },
    {
      fromStates: ['qualification_underway'],
      toState: 'no_bid',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER'],
      sideEffects: ['log_no_bid'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'No-Bid This Pursuit',
    },

    // --- From Site Walk Scheduled ---
    {
      fromStates: ['site_walk_scheduled'],
      toState: 'site_walk_complete',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['notify_site_walk_completed'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark Site Walk Complete',
    },
    {
      fromStates: ['site_walk_scheduled'],
      toState: 'no_bid',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER'],
      sideEffects: ['log_no_bid'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'No-Bid This Pursuit',
    },

    // --- From Site Walk Complete ---
    {
      fromStates: ['site_walk_complete'],
      toState: 'closeout_plan_drafted',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD'],
      sideEffects: ['notify_closeout_plan_created'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Draft Closeout Plan',
    },
    {
      fromStates: ['site_walk_complete'],
      toState: 'no_bid',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER'],
      sideEffects: ['log_no_bid'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'No-Bid This Pursuit',
    },

    // --- From Closeout Plan Drafted ---
    {
      fromStates: ['closeout_plan_drafted'],
      toState: 'closeout_plan_approved',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'APPROVER'],
      sideEffects: ['notify_closeout_plan_approved'],
      blockers: [],
      requiresApproval: true,
      requiresReason: false,
      label: 'Approve Closeout Plan',
    },
    {
      fromStates: ['closeout_plan_drafted'],
      toState: 'no_bid',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER'],
      sideEffects: ['log_no_bid'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'No-Bid This Pursuit',
    },

    // --- From Closeout Plan Approved ---
    {
      fromStates: ['closeout_plan_approved'],
      toState: 'scope_development',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'COM_COORD', 'EST_LEAD'],
      sideEffects: ['notify_scope_development_started'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Begin Scope Development',
    },
    {
      fromStates: ['closeout_plan_approved'],
      toState: 'no_bid',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER'],
      sideEffects: ['log_no_bid'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'No-Bid This Pursuit',
    },

    // --- From Scope Development ---
    {
      fromStates: ['scope_development'],
      toState: 'internal_review',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'EST_LEAD'],
      sideEffects: ['notify_internal_review_started'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Submit for Internal Review',
    },
    {
      fromStates: ['scope_development'],
      toState: 'no_bid',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER'],
      sideEffects: ['log_no_bid'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'No-Bid This Pursuit',
    },

    // --- From Internal Review ---
    {
      fromStates: ['internal_review'],
      toState: 'estimate_ready',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'EST_LEAD', 'APPROVER'],
      sideEffects: ['notify_estimate_ready'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark Estimate Ready',
    },
    {
      fromStates: ['internal_review'],
      toState: 'scope_development',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER', 'EST_LEAD'],
      sideEffects: ['notify_returned_to_scope'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Return to Scope Development',
    },
    {
      fromStates: ['internal_review'],
      toState: 'no_bid',
      requiredFields: [],
      requiredRoles: ['SYS_ADMIN', 'COM_LEAD', 'BD_OWNER'],
      sideEffects: ['log_no_bid'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'No-Bid This Pursuit',
    },
  ],
}
