import { describe, it, expect } from 'vitest'
import { validateTransition, getAvailableTransitions } from '@/lib/state-machines/engine'
import { estimateStateMachine, ESTIMATE_STATUSES, ESTIMATE_STATUS_LABELS, ESTIMATE_ACTIVE_STATUSES } from '@/lib/state-machines/estimate'
import type { EstimateStatus } from '@/lib/state-machines/estimate'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'est-1',
    project_name: 'Test Estimate',
    linked_pursuit_id: 'pur-1',
    linked_client_id: 'c1',
    ...overrides,
  }
}

function transition(
  from: EstimateStatus,
  to: EstimateStatus,
  roles: Role[] = ['estimating'],
  entity: Record<string, unknown> = makeEntity(),
  reason?: string,
  approvalGranted?: boolean,
) {
  return validateTransition(estimateStateMachine, {
    currentState: from,
    targetState: to,
    entity,
    actorRoles: roles,
    reason,
    approvalGranted,
  })
}

// ---------------------------------------------------------------------------
// Machine definition (ERP-13 Table 11)
// ---------------------------------------------------------------------------

describe('Estimate State Machine — Structure', () => {
  it('has 5 statuses (ERP-13)', () => {
    expect(ESTIMATE_STATUSES.length).toBe(5)
  })

  it('statuses match ERP-13 Table 11', () => {
    expect([...ESTIMATE_STATUSES]).toEqual([
      'draft', 'in_build', 'qa_review', 'approved_for_proposal', 'superseded',
    ])
  })

  it('initial status is draft', () => {
    expect(estimateStateMachine.initialState).toBe('draft')
  })

  it('terminal status is superseded', () => {
    expect(estimateStateMachine.terminalStates).toEqual(['superseded'])
  })

  it('has 4 active forward statuses', () => {
    expect(ESTIMATE_ACTIVE_STATUSES).toHaveLength(4)
  })

  it('has labels for all statuses', () => {
    for (const status of ESTIMATE_STATUSES) {
      expect(ESTIMATE_STATUS_LABELS[status]).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// Forward progression (happy path per ERP-13)
// ---------------------------------------------------------------------------

describe('Estimate State Machine — Forward Progression', () => {
  it('allows draft → in_build', () => {
    const result = transition('draft', 'in_build')
    expect(result.allowed).toBe(true)
  })

  it('allows in_build → qa_review with pricing_summary', () => {
    const entity = makeEntity({
      pricing_summary: { stage_breakdowns: [], subtotal: 1000, adjustments: 0, grand_total: 1000 },
    })
    const result = transition('in_build', 'qa_review', ['estimating'], entity)
    expect(result.allowed).toBe(true)
  })

  it('blocks in_build → qa_review without pricing_summary', () => {
    const result = transition('in_build', 'qa_review')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('pricing'))).toBe(true)
  })

  it('allows qa_review → approved_for_proposal with qa_reviewer_id and approval', () => {
    const entity = makeEntity({ qa_reviewer_id: 'reviewer-1' })
    const result = transition('qa_review', 'approved_for_proposal', ['estimating'], entity, undefined, true)
    expect(result.allowed).toBe(true)
  })

  it('blocks qa_review → approved_for_proposal without qa_reviewer_id', () => {
    const result = transition('qa_review', 'approved_for_proposal', ['estimating'], makeEntity(), undefined, true)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reviewer'))).toBe(true)
  })

  it('blocks qa_review → approved_for_proposal without approval', () => {
    const entity = makeEntity({ qa_reviewer_id: 'reviewer-1' })
    const result = transition('qa_review', 'approved_for_proposal', ['estimating'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('approval'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// QA Rejection flow
// ---------------------------------------------------------------------------

describe('Estimate State Machine — QA Rejection', () => {
  it('allows qa_review → in_build with reason and qa_notes', () => {
    const entity = makeEntity({ qa_notes: 'Rates need revision' })
    const result = transition('qa_review', 'in_build', ['estimating'], entity, 'Pricing too high')
    expect(result.allowed).toBe(true)
  })

  it('blocks qa_review → in_build without reason', () => {
    const entity = makeEntity({ qa_notes: 'notes' })
    const result = transition('qa_review', 'in_build', ['estimating'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Supersede flow
// ---------------------------------------------------------------------------

describe('Estimate State Machine — Supersede', () => {
  it('allows approved_for_proposal → superseded with superseded_by_id and reason', () => {
    const entity = makeEntity({ superseded_by_id: 'est-2' })
    const result = transition('approved_for_proposal', 'superseded', ['estimating'], entity, 'New version created')
    expect(result.allowed).toBe(true)
  })

  it('blocks approved_for_proposal → superseded without reason', () => {
    const entity = makeEntity({ superseded_by_id: 'est-2' })
    const result = transition('approved_for_proposal', 'superseded', ['estimating'], entity)
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Terminal state
// ---------------------------------------------------------------------------

describe('Estimate State Machine — Terminal State', () => {
  it('blocks any transition from superseded', () => {
    const result = transition('superseded', 'draft', ['leadership_system_admin'])
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('terminal'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Blocked transitions (invalid jumps)
// ---------------------------------------------------------------------------

describe('Estimate State Machine — Blocked Transitions', () => {
  const invalidJumps: [EstimateStatus, EstimateStatus][] = [
    ['draft', 'qa_review'],
    ['draft', 'approved_for_proposal'],
    ['in_build', 'approved_for_proposal'],
    ['in_build', 'superseded'],
  ]

  for (const [from, to] of invalidJumps) {
    it(`blocks ${from} → ${to}`, () => {
      const result = transition(from, to, ['leadership_system_admin'])
      expect(result.allowed).toBe(false)
    })
  }
})

// ---------------------------------------------------------------------------
// Role checks
// ---------------------------------------------------------------------------

describe('Estimate State Machine — Role Checks', () => {
  it('blocks commercial_bd from advancing estimates', () => {
    const result = transition('draft', 'in_build', ['commercial_bd'])
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('permissions'))).toBe(true)
  })

  it('allows estimating role to advance', () => {
    const result = transition('draft', 'in_build', ['estimating'])
    expect(result.allowed).toBe(true)
  })

  it('allows leadership to advance', () => {
    const result = transition('draft', 'in_build', ['leadership_system_admin'])
    expect(result.allowed).toBe(true)
  })

  it('blocks pm_ops from advancing', () => {
    const result = transition('draft', 'in_build', ['pm_ops'])
    expect(result.allowed).toBe(false)
  })

  it('blocks readonly_stakeholder from advancing', () => {
    const result = transition('draft', 'in_build', ['readonly_stakeholder'])
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Side effects
// ---------------------------------------------------------------------------

describe('Estimate State Machine — Side Effects', () => {
  it('draft → in_build returns notify_estimate_build_started', () => {
    const result = transition('draft', 'in_build')
    expect(result.sideEffects).toContain('notify_estimate_build_started')
  })

  it('qa_review → approved_for_proposal returns enable_proposal_creation', () => {
    const entity = makeEntity({ qa_reviewer_id: 'reviewer-1' })
    const result = transition('qa_review', 'approved_for_proposal', ['estimating'], entity, undefined, true)
    expect(result.sideEffects).toContain('enable_proposal_creation')
  })
})

// ---------------------------------------------------------------------------
// getAvailableTransitions
// ---------------------------------------------------------------------------

describe('Estimate State Machine — Available Transitions', () => {
  it('draft has 1 transition for estimating (in_build only)', () => {
    const transitions = getAvailableTransitions(estimateStateMachine, 'draft', ['estimating'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('in_build')
  })

  it('in_build has 1 transition for estimating (qa_review)', () => {
    const transitions = getAvailableTransitions(estimateStateMachine, 'in_build', ['estimating'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('qa_review')
  })

  it('qa_review has 2 transitions for estimating (in_build, approved_for_proposal)', () => {
    const transitions = getAvailableTransitions(estimateStateMachine, 'qa_review', ['estimating'])
    expect(transitions.length).toBe(2)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['approved_for_proposal', 'in_build'])
  })

  it('superseded has 0 transitions (terminal)', () => {
    const transitions = getAvailableTransitions(estimateStateMachine, 'superseded', ['leadership_system_admin'])
    expect(transitions.length).toBe(0)
  })
})
