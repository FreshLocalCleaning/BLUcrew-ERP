/**
 * Mobilization State Machine
 *
 * Pure logic — no database dependency.
 * ERP-13: Mobilization lifecycle — child record under Project.
 *
 * 7 states:
 *   handoff_incomplete → needs_planning → ready → in_field → complete
 *   + blocked (reachable from needs_planning, ready, in_field)
 *   + cancelled (reachable from blocked, ready)
 *
 * Terminal: complete, cancelled
 */

import type { StateMachineDef } from './engine'

// ---------------------------------------------------------------------------
// Mobilization States (ERP-13)
// ---------------------------------------------------------------------------

export const MOBILIZATION_STATES = [
  'handoff_incomplete',
  'needs_planning',
  'blocked',
  'ready',
  'in_field',
  'complete',
  'cancelled',
] as const

export type MobilizationState = (typeof MOBILIZATION_STATES)[number]

export const MOBILIZATION_STATE_LABELS: Record<MobilizationState, string> = {
  handoff_incomplete: 'Handoff Incomplete',
  needs_planning: 'Needs Planning',
  blocked: 'Blocked',
  ready: 'Ready',
  in_field: 'In Field',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

// ---------------------------------------------------------------------------
// Readiness gate helper
// ---------------------------------------------------------------------------

const READINESS_FIELDS = [
  'crew_confirmed',
  'equipment_loaded',
  'travel_booked',
  'lodging_booked',
  'per_diem_approved',
] as const

export function checkReadinessGate(entity: Record<string, unknown>): string | null {
  const checklist = entity['readiness_checklist'] as Record<string, boolean> | undefined
  if (!checklist) {
    return 'Readiness checklist is missing.'
  }
  const missing = READINESS_FIELDS.filter((f) => !checklist[f])
  if (missing.length > 0) {
    return `Readiness gate incomplete: ${missing.join(', ')} must be true.`
  }
  return null
}

// ---------------------------------------------------------------------------
// Machine Definition (ERP-13)
// ---------------------------------------------------------------------------

export const mobilizationStateMachine: StateMachineDef<MobilizationState> = {
  entityType: 'mobilization',
  states: MOBILIZATION_STATES,
  initialState: 'handoff_incomplete',
  terminalStates: ['complete', 'cancelled'],
  transitions: [
    // --- handoff_incomplete → needs_planning ---
    {
      fromStates: ['handoff_incomplete'],
      toState: 'needs_planning',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_planning_started'],
      blockers: [
        (entity) => {
          const missingItems = entity['missing_items_log'] as string[] | null | undefined
          if (missingItems && missingItems.length > 0) {
            return `Cannot move to planning: ${missingItems.length} missing item(s) must be resolved first.`
          }
          return null
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Start Planning',
    },

    // --- needs_planning → blocked ---
    {
      fromStates: ['needs_planning'],
      toState: 'blocked',
      requiredFields: ['blocker_reason', 'blocker_owner'],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_blocked'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark Blocked',
    },

    // --- needs_planning → ready (readiness gate) ---
    {
      fromStates: ['needs_planning'],
      toState: 'ready',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_ready'],
      blockers: [
        (entity) => {
          // If compressed_planning is true and exception_flag is true, skip readiness gate
          if (entity['compressed_planning'] === true && entity['exception_flag'] === true) {
            return null
          }
          return checkReadinessGate(entity)
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark Ready',
    },

    // --- blocked → needs_planning ---
    {
      fromStates: ['blocked'],
      toState: 'needs_planning',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_unblocked'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Resolve Blocker',
    },

    // --- blocked → cancelled ---
    {
      fromStates: ['blocked'],
      toState: 'cancelled',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_cancelled'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Cancel Mobilization',
    },

    // --- ready → in_field ---
    {
      fromStates: ['ready'],
      toState: 'in_field',
      requiredFields: ['actual_start_date'],
      requiredRoles: ['leadership_system_admin', 'pm_ops', 'team_lead'],
      sideEffects: ['notify_deployed', 'sync_jobber'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Deploy to Field',
    },

    // --- ready → blocked ---
    {
      fromStates: ['ready'],
      toState: 'blocked',
      requiredFields: ['blocker_reason', 'blocker_owner'],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_blocked'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark Blocked',
    },

    // --- ready → cancelled ---
    {
      fromStates: ['ready'],
      toState: 'cancelled',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_cancelled'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Cancel Mobilization',
    },

    // --- in_field → complete (completion gate) ---
    {
      fromStates: ['in_field'],
      toState: 'complete',
      requiredFields: ['photo_report_link'],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_complete', 'trigger_invoice_staging'],
      blockers: [
        (entity) => {
          if (!entity['client_signoff_status']) {
            return 'Client sign-off status must be set before completing.'
          }
          return null
        },
        (entity) => {
          const qc = entity['qc_stage_completion'] as Record<string, unknown> | null | undefined
          if (!qc) {
            return 'QC stage completion must be logged before completing.'
          }
          return null
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark Complete',
    },

    // --- in_field → blocked ---
    {
      fromStates: ['in_field'],
      toState: 'blocked',
      requiredFields: ['blocker_reason', 'blocker_owner'],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_blocked'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Mark Blocked (Field Issue)',
    },
  ],
}
