/**
 * Award/Handoff State Machine
 *
 * Pure logic — no database dependency.
 * ERP-13: Award status pipeline — bridge from Commercial to PM/Ops.
 *
 * 5 states (one-way handoff pipeline):
 *   awarded_intake_open → compliance_in_progress → handoff_posted → pm_claimed → closed_to_ops
 *
 * Key rules:
 * - No backward transitions — this is a one-way pipeline.
 * - closed_to_ops auto-creates the parent Project record.
 * - PM claim sets pm_claim_user_id and pm_claim_timestamp.
 * - Compliance docs must all be received/waived before handoff_posted.
 */

import type { StateMachineDef } from './engine'

// ---------------------------------------------------------------------------
// Award/Handoff States (ERP-13)
// ---------------------------------------------------------------------------

export const AWARD_HANDOFF_STATES = [
  'awarded_intake_open',
  'compliance_in_progress',
  'handoff_posted',
  'pm_claimed',
  'closed_to_ops',
] as const

export type AwardHandoffState = (typeof AWARD_HANDOFF_STATES)[number]

export const AWARD_HANDOFF_STATE_LABELS: Record<AwardHandoffState, string> = {
  awarded_intake_open: 'Awarded — Intake Open',
  compliance_in_progress: 'Compliance In Progress',
  handoff_posted: 'Handoff Posted',
  pm_claimed: 'PM Claimed',
  closed_to_ops: 'Closed to Ops',
}

// ---------------------------------------------------------------------------
// Machine Definition (ERP-13)
// ---------------------------------------------------------------------------

export const awardHandoffStateMachine: StateMachineDef<AwardHandoffState> = {
  entityType: 'award_handoff',
  states: AWARD_HANDOFF_STATES,
  initialState: 'awarded_intake_open',
  terminalStates: ['closed_to_ops'],
  transitions: [
    // --- awarded_intake_open → compliance_in_progress ---
    // Commercial/BD initiates compliance tracking.
    {
      fromStates: ['awarded_intake_open'],
      toState: 'compliance_in_progress',
      requiredFields: ['compliance_tracker'],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_compliance_started'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Start Compliance',
    },

    // --- compliance_in_progress → handoff_posted ---
    // All required compliance docs must be received or waived. No open startup blockers.
    {
      fromStates: ['compliance_in_progress'],
      toState: 'handoff_posted',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'commercial_bd'],
      sideEffects: ['notify_handoff_posted', 'post_teams_handoff'],
      blockers: [
        (entity) => {
          const tracker = entity['compliance_tracker'] as
            | { required: boolean; status: string }[]
            | undefined
          if (!tracker || !Array.isArray(tracker)) {
            return 'Compliance tracker must be initialized before posting handoff.'
          }
          const pendingRequired = tracker.filter(
            (doc) => doc.required && doc.status === 'pending',
          )
          if (pendingRequired.length > 0) {
            return `${pendingRequired.length} required compliance document(s) are still pending. All must be received or waived.`
          }
          return null
        },
        (entity) => {
          const blockers = entity['startup_blockers'] as
            | { status: string }[]
            | undefined
          if (!blockers || !Array.isArray(blockers)) return null
          const openBlockers = blockers.filter((b) => b.status === 'open')
          if (openBlockers.length > 0) {
            return `${openBlockers.length} startup blocker(s) are still open. All must be resolved before posting handoff.`
          }
          return null
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Post Handoff',
    },

    // --- handoff_posted → pm_claimed ---
    // PM/Ops claims the handoff. Sets pm_claim_user_id and timestamp.
    {
      fromStates: ['handoff_posted'],
      toState: 'pm_claimed',
      requiredFields: ['pm_claim_user_id'],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['notify_pm_claimed'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Claim Handoff',
    },

    // --- pm_claimed → closed_to_ops ---
    // PM confirms receipt. Auto-creates parent Project at startup_pending.
    {
      fromStates: ['pm_claimed'],
      toState: 'closed_to_ops',
      requiredFields: ['pm_claim_user_id'],
      requiredRoles: ['leadership_system_admin', 'pm_ops'],
      sideEffects: ['auto_create_project', 'notify_closed_to_ops'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Close to Ops',
    },
  ],
}
