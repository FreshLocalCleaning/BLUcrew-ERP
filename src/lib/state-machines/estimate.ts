/**
 * Estimate State Machine
 *
 * Pure logic — no database dependency.
 * ERP-13 Table 11: Estimate status pipeline.
 *
 * 5 statuses:
 *   Draft → In Build → QA Review → Approved for Proposal → Superseded
 */

import type { StateMachineDef } from './engine'

// ---------------------------------------------------------------------------
// Estimate Statuses (ERP-13 Table 11)
// ---------------------------------------------------------------------------

export const ESTIMATE_STATUSES = [
  'draft',
  'in_build',
  'qa_review',
  'approved_for_proposal',
  'superseded',
] as const

export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number]

export const ESTIMATE_STATUS_LABELS: Record<EstimateStatus, string> = {
  draft: 'Draft',
  in_build: 'In Build',
  qa_review: 'QA Review',
  approved_for_proposal: 'Approved for Proposal',
  superseded: 'Superseded',
}

/** Active forward statuses (excluding superseded) for progression tracker */
export const ESTIMATE_ACTIVE_STATUSES: EstimateStatus[] = [
  'draft',
  'in_build',
  'qa_review',
  'approved_for_proposal',
]

// ---------------------------------------------------------------------------
// Machine Definition (ERP-13 Table 11)
// ---------------------------------------------------------------------------

export const estimateStateMachine: StateMachineDef<EstimateStatus> = {
  entityType: 'estimate',
  states: ESTIMATE_STATUSES,
  initialState: 'draft',
  terminalStates: ['superseded'],
  transitions: [
    // --- Draft → In Build ---
    // User opens the embedded FLC Estimator to start building
    {
      fromStates: ['draft'],
      toState: 'in_build',
      requiredFields: [],
      requiredRoles: ['leadership_system_admin', 'estimating'],
      sideEffects: ['notify_estimate_build_started'],
      blockers: [],
      requiresApproval: false,
      requiresReason: false,
      label: 'Start Building Estimate',
    },

    // --- In Build → QA Review ---
    // Requires pricing_summary populated from estimator output
    {
      fromStates: ['in_build'],
      toState: 'qa_review',
      requiredFields: ['pricing_summary'],
      requiredRoles: ['leadership_system_admin', 'estimating'],
      sideEffects: ['notify_qa_review_requested'],
      blockers: [
        (entity) => {
          const summary = entity['pricing_summary']
          if (summary && typeof summary === 'object') return null
          return 'Pricing summary must be populated from the estimator before submitting for QA review.'
        },
      ],
      requiresApproval: false,
      requiresReason: false,
      label: 'Submit for QA Review',
    },

    // --- QA Review → In Build (rejection) ---
    // QA reviewer sends back with notes
    {
      fromStates: ['qa_review'],
      toState: 'in_build',
      requiredFields: ['qa_notes'],
      requiredRoles: ['leadership_system_admin', 'estimating'],
      sideEffects: ['notify_qa_rejected'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Return to Build (QA Rejection)',
    },

    // --- QA Review → Approved for Proposal ---
    // QA reviewer signs off
    {
      fromStates: ['qa_review'],
      toState: 'approved_for_proposal',
      requiredFields: ['qa_reviewer_id'],
      requiredRoles: ['leadership_system_admin', 'estimating'],
      sideEffects: ['notify_estimate_approved', 'enable_proposal_creation'],
      blockers: [
        (entity) => {
          if (entity['qa_reviewer_id']) return null
          return 'A QA reviewer must be assigned before approving the estimate.'
        },
      ],
      requiresApproval: true,
      requiresReason: false,
      label: 'Approve for Proposal',
    },

    // --- Approved for Proposal → Superseded ---
    // When a new version is created
    {
      fromStates: ['approved_for_proposal'],
      toState: 'superseded',
      requiredFields: ['superseded_by_id'],
      requiredRoles: ['leadership_system_admin', 'estimating'],
      sideEffects: ['log_version_superseded'],
      blockers: [],
      requiresApproval: false,
      requiresReason: true,
      label: 'Supersede (New Version Created)',
    },
  ],
}
