import { describe, it, expect } from 'vitest'
import { validateTransition, getAvailableTransitions } from '@/lib/state-machines/engine'
import { proposalStateMachine, PROPOSAL_STATUSES, PROPOSAL_STATUS_LABELS } from '@/lib/state-machines/proposal'
import type { ProposalStatus } from '@/lib/state-machines/proposal'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'pro-1',
    project_name: 'Test Proposal',
    linked_estimate_id: 'est-1',
    linked_client_id: 'c1',
    proposal_value: 25000,
    decision_target_date: '2026-04-01',
    ...overrides,
  }
}

function transition(
  from: ProposalStatus,
  to: ProposalStatus,
  roles: Role[] = ['commercial_bd'],
  entity: Record<string, unknown> = makeEntity(),
  reason?: string,
) {
  return validateTransition(proposalStateMachine, {
    currentState: from,
    targetState: to,
    entity,
    actorRoles: roles,
    reason,
  })
}

// ---------------------------------------------------------------------------
// Machine definition (ERP-13 Table 12)
// ---------------------------------------------------------------------------

describe('Proposal State Machine — Structure', () => {
  it('has 6 statuses (ERP-13)', () => {
    expect(PROPOSAL_STATUSES.length).toBe(6)
  })

  it('statuses match ERP-13 Table 12', () => {
    expect([...PROPOSAL_STATUSES]).toEqual([
      'delivered', 'in_review', 'hold', 'accepted', 'rejected', 'dormant',
    ])
  })

  it('initial status is delivered', () => {
    expect(proposalStateMachine.initialState).toBe('delivered')
  })

  it('terminal statuses are accepted and rejected', () => {
    expect(proposalStateMachine.terminalStates.sort()).toEqual(['accepted', 'rejected'])
  })

  it('has labels for all statuses', () => {
    for (const status of PROPOSAL_STATUSES) {
      expect(PROPOSAL_STATUS_LABELS[status]).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// Forward progression (happy path)
// ---------------------------------------------------------------------------

describe('Proposal State Machine — Forward Progression', () => {
  it('allows delivered → in_review with decision_target_date', () => {
    const result = transition('delivered', 'in_review')
    expect(result.allowed).toBe(true)
  })

  it('blocks delivered → in_review without decision_target_date', () => {
    const entity = makeEntity({ decision_target_date: '' })
    const result = transition('delivered', 'in_review', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('decision_target_date'))).toBe(true)
  })

  it('allows in_review → accepted with acceptance_confirmation_method', () => {
    const entity = makeEntity({ acceptance_confirmation_method: 'email' })
    const result = transition('in_review', 'accepted', ['commercial_bd'], entity)
    expect(result.allowed).toBe(true)
  })

  it('blocks in_review → accepted without acceptance_confirmation_method', () => {
    const entity = makeEntity({ acceptance_confirmation_method: null })
    const result = transition('in_review', 'accepted', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('confirmation'))).toBe(true)
  })

  it('allows in_review → rejected with reason', () => {
    const result = transition('in_review', 'rejected', ['commercial_bd'], makeEntity(), 'Budget constraints')
    expect(result.allowed).toBe(true)
  })

  it('blocks in_review → rejected without reason', () => {
    const result = transition('in_review', 'rejected')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Hold transitions
// ---------------------------------------------------------------------------

describe('Proposal State Machine — Hold Transitions', () => {
  it('allows in_review → hold with reason', () => {
    const result = transition('in_review', 'hold', ['commercial_bd'], makeEntity(), 'Waiting on budget approval')
    expect(result.allowed).toBe(true)
  })

  it('blocks in_review → hold without reason', () => {
    const result = transition('in_review', 'hold')
    expect(result.allowed).toBe(false)
  })

  it('allows hold → in_review with reason', () => {
    const result = transition('hold', 'in_review', ['commercial_bd'], makeEntity(), 'Unblocked')
    expect(result.allowed).toBe(true)
  })

  it('allows hold → rejected with reason', () => {
    const result = transition('hold', 'rejected', ['commercial_bd'], makeEntity(), 'Dead deal')
    expect(result.allowed).toBe(true)
  })

  it('allows hold → dormant with reason', () => {
    const result = transition('hold', 'dormant', ['commercial_bd'], makeEntity(), 'Extended delay')
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Dormant transitions
// ---------------------------------------------------------------------------

describe('Proposal State Machine — Dormant Transitions', () => {
  it('allows in_review → dormant with reason', () => {
    const result = transition('in_review', 'dormant', ['commercial_bd'], makeEntity(), 'No response')
    expect(result.allowed).toBe(true)
  })

  it('allows dormant → in_review with reason', () => {
    const result = transition('dormant', 'in_review', ['commercial_bd'], makeEntity(), 'Client revived interest')
    expect(result.allowed).toBe(true)
  })

  it('allows dormant → rejected with reason', () => {
    const result = transition('dormant', 'rejected', ['commercial_bd'], makeEntity(), 'Confirmed dead')
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Terminal states
// ---------------------------------------------------------------------------

describe('Proposal State Machine — Terminal States', () => {
  it('blocks any transition from accepted', () => {
    const result = transition('accepted', 'in_review', ['leadership_system_admin'], makeEntity(), 'Try again')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('terminal'))).toBe(true)
  })

  it('blocks any transition from rejected', () => {
    const result = transition('rejected', 'in_review', ['leadership_system_admin'], makeEntity(), 'Try again')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('terminal'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Blocked transitions (invalid jumps)
// ---------------------------------------------------------------------------

describe('Proposal State Machine — Blocked Transitions', () => {
  const invalidJumps: [ProposalStatus, ProposalStatus][] = [
    ['delivered', 'accepted'],
    ['delivered', 'rejected'],
    ['delivered', 'hold'],
    ['delivered', 'dormant'],
    ['hold', 'accepted'],
  ]

  for (const [from, to] of invalidJumps) {
    it(`blocks ${from} → ${to}`, () => {
      const result = transition(from, to, ['leadership_system_admin'], makeEntity(), 'reason')
      expect(result.allowed).toBe(false)
    })
  }
})

// ---------------------------------------------------------------------------
// Role checks
// ---------------------------------------------------------------------------

describe('Proposal State Machine — Role Checks', () => {
  it('blocks readonly_stakeholder from advancing', () => {
    const result = transition('delivered', 'in_review', ['readonly_stakeholder'])
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('permissions'))).toBe(true)
  })

  it('allows commercial_bd to advance', () => {
    const result = transition('delivered', 'in_review', ['commercial_bd'])
    expect(result.allowed).toBe(true)
  })

  it('allows leadership to advance', () => {
    const result = transition('delivered', 'in_review', ['leadership_system_admin'])
    expect(result.allowed).toBe(true)
  })

  it('blocks estimating from advancing proposals', () => {
    const result = transition('delivered', 'in_review', ['estimating'])
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Side effects
// ---------------------------------------------------------------------------

describe('Proposal State Machine — Side Effects', () => {
  it('in_review → accepted returns auto_create_award_handoff', () => {
    const entity = makeEntity({ acceptance_confirmation_method: 'email' })
    const result = transition('in_review', 'accepted', ['commercial_bd'], entity)
    expect(result.sideEffects).toContain('auto_create_award_handoff')
  })

  it('in_review → rejected returns log_rejection_reason', () => {
    const result = transition('in_review', 'rejected', ['commercial_bd'], makeEntity(), 'Too expensive')
    expect(result.sideEffects).toContain('log_rejection_reason')
  })
})

// ---------------------------------------------------------------------------
// getAvailableTransitions
// ---------------------------------------------------------------------------

describe('Proposal State Machine — Available Transitions', () => {
  it('delivered has 1 transition for commercial_bd', () => {
    const transitions = getAvailableTransitions(proposalStateMachine, 'delivered', ['commercial_bd'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('in_review')
  })

  it('in_review has 4 transitions for commercial_bd', () => {
    const transitions = getAvailableTransitions(proposalStateMachine, 'in_review', ['commercial_bd'])
    expect(transitions.length).toBe(4)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['accepted', 'dormant', 'hold', 'rejected'])
  })

  it('hold has 3 transitions for commercial_bd', () => {
    const transitions = getAvailableTransitions(proposalStateMachine, 'hold', ['commercial_bd'])
    expect(transitions.length).toBe(3)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['dormant', 'in_review', 'rejected'])
  })

  it('accepted has 0 transitions (terminal)', () => {
    const transitions = getAvailableTransitions(proposalStateMachine, 'accepted', ['leadership_system_admin'])
    expect(transitions.length).toBe(0)
  })

  it('rejected has 0 transitions (terminal)', () => {
    const transitions = getAvailableTransitions(proposalStateMachine, 'rejected', ['leadership_system_admin'])
    expect(transitions.length).toBe(0)
  })

  it('dormant has 2 transitions for commercial_bd', () => {
    const transitions = getAvailableTransitions(proposalStateMachine, 'dormant', ['commercial_bd'])
    expect(transitions.length).toBe(2)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['in_review', 'rejected'])
  })
})
