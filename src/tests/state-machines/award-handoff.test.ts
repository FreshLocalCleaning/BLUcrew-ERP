import { describe, it, expect } from 'vitest'
import { validateTransition, getAvailableTransitions } from '@/lib/state-machines/engine'
import { awardHandoffStateMachine, AWARD_HANDOFF_STATES, AWARD_HANDOFF_STATE_LABELS } from '@/lib/state-machines/award-handoff'
import type { AwardHandoffState } from '@/lib/state-machines/award-handoff'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'awd-1',
    project_name: 'Test Award',
    linked_proposal_id: 'pro-1',
    linked_client_id: 'c1',
    compliance_tracker: [
      { doc_name: 'COI', required: true, status: 'received', received_date: '2026-01-01', notes: null },
      { doc_name: 'W-9', required: true, status: 'received', received_date: '2026-01-01', notes: null },
    ],
    startup_blockers: [],
    pm_claim_user_id: 'cullen',
    ...overrides,
  }
}

function transition(
  from: AwardHandoffState,
  to: AwardHandoffState,
  roles: Role[] = ['commercial_bd'],
  entity: Record<string, unknown> = makeEntity(),
  reason?: string,
) {
  return validateTransition(awardHandoffStateMachine, {
    currentState: from,
    targetState: to,
    entity,
    actorRoles: roles,
    reason,
  })
}

// ---------------------------------------------------------------------------
// Machine definition
// ---------------------------------------------------------------------------

describe('Award/Handoff State Machine — Structure', () => {
  it('has 5 states (ERP-13)', () => {
    expect(AWARD_HANDOFF_STATES.length).toBe(5)
  })

  it('states match ERP-13', () => {
    expect([...AWARD_HANDOFF_STATES]).toEqual([
      'awarded_intake_open', 'compliance_in_progress', 'handoff_posted', 'pm_claimed', 'closed_to_ops',
    ])
  })

  it('initial state is awarded_intake_open', () => {
    expect(awardHandoffStateMachine.initialState).toBe('awarded_intake_open')
  })

  it('terminal state is closed_to_ops', () => {
    expect(awardHandoffStateMachine.terminalStates).toEqual(['closed_to_ops'])
  })

  it('has labels for all states', () => {
    for (const state of AWARD_HANDOFF_STATES) {
      expect(AWARD_HANDOFF_STATE_LABELS[state]).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// Forward progression (happy path)
// ---------------------------------------------------------------------------

describe('Award/Handoff State Machine — Forward Progression', () => {
  it('allows awarded_intake_open → compliance_in_progress', () => {
    const result = transition('awarded_intake_open', 'compliance_in_progress')
    expect(result.allowed).toBe(true)
  })

  it('blocks awarded_intake_open → compliance_in_progress without compliance_tracker', () => {
    const entity = makeEntity({ compliance_tracker: '' })
    const result = transition('awarded_intake_open', 'compliance_in_progress', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('compliance_tracker'))).toBe(true)
  })

  it('allows compliance_in_progress → handoff_posted when all docs resolved', () => {
    const result = transition('compliance_in_progress', 'handoff_posted')
    expect(result.allowed).toBe(true)
  })

  it('blocks compliance_in_progress → handoff_posted with pending required docs', () => {
    const entity = makeEntity({
      compliance_tracker: [
        { doc_name: 'COI', required: true, status: 'pending', received_date: null, notes: null },
        { doc_name: 'W-9', required: true, status: 'received', received_date: '2026-01-01', notes: null },
      ],
    })
    const result = transition('compliance_in_progress', 'handoff_posted', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('pending'))).toBe(true)
  })

  it('allows handoff_posted when optional docs are pending', () => {
    const entity = makeEntity({
      compliance_tracker: [
        { doc_name: 'COI', required: true, status: 'received', received_date: '2026-01-01', notes: null },
        { doc_name: 'Optional Doc', required: false, status: 'pending', received_date: null, notes: null },
      ],
    })
    const result = transition('compliance_in_progress', 'handoff_posted', ['commercial_bd'], entity)
    expect(result.allowed).toBe(true)
  })

  it('blocks compliance_in_progress → handoff_posted with open blockers', () => {
    const entity = makeEntity({
      startup_blockers: [
        { blocker: 'Missing access badge', owner: 'PM', status: 'open', resolved_date: null },
      ],
    })
    const result = transition('compliance_in_progress', 'handoff_posted', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('blocker'))).toBe(true)
  })

  it('allows handoff_posted → pm_claimed', () => {
    const result = transition('handoff_posted', 'pm_claimed', ['pm_ops'])
    expect(result.allowed).toBe(true)
  })

  it('blocks handoff_posted → pm_claimed without pm_claim_user_id', () => {
    const entity = makeEntity({ pm_claim_user_id: null })
    const result = transition('handoff_posted', 'pm_claimed', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('pm_claim_user_id'))).toBe(true)
  })

  it('allows pm_claimed → closed_to_ops', () => {
    const result = transition('pm_claimed', 'closed_to_ops', ['pm_ops'])
    expect(result.allowed).toBe(true)
  })

  it('pm_claimed → closed_to_ops has auto_create_project side effect', () => {
    const result = transition('pm_claimed', 'closed_to_ops', ['pm_ops'])
    expect(result.sideEffects).toContain('auto_create_project')
  })
})

// ---------------------------------------------------------------------------
// Terminal state
// ---------------------------------------------------------------------------

describe('Award/Handoff State Machine — Terminal State', () => {
  it('blocks any transition from closed_to_ops', () => {
    const result = transition('closed_to_ops', 'pm_claimed', ['leadership_system_admin'], makeEntity(), 'Try again')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('terminal'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// No backward transitions
// ---------------------------------------------------------------------------

describe('Award/Handoff State Machine — No Backward Transitions', () => {
  const backwardJumps: [AwardHandoffState, AwardHandoffState][] = [
    ['compliance_in_progress', 'awarded_intake_open'],
    ['handoff_posted', 'compliance_in_progress'],
    ['handoff_posted', 'awarded_intake_open'],
    ['pm_claimed', 'handoff_posted'],
    ['pm_claimed', 'compliance_in_progress'],
    ['pm_claimed', 'awarded_intake_open'],
  ]

  for (const [from, to] of backwardJumps) {
    it(`blocks ${from} → ${to}`, () => {
      const result = transition(from, to, ['leadership_system_admin'], makeEntity(), 'reason')
      expect(result.allowed).toBe(false)
    })
  }
})

// ---------------------------------------------------------------------------
// Skip transitions (invalid jumps)
// ---------------------------------------------------------------------------

describe('Award/Handoff State Machine — Invalid Skips', () => {
  const invalidSkips: [AwardHandoffState, AwardHandoffState][] = [
    ['awarded_intake_open', 'handoff_posted'],
    ['awarded_intake_open', 'pm_claimed'],
    ['awarded_intake_open', 'closed_to_ops'],
    ['compliance_in_progress', 'pm_claimed'],
    ['compliance_in_progress', 'closed_to_ops'],
    ['handoff_posted', 'closed_to_ops'],
  ]

  for (const [from, to] of invalidSkips) {
    it(`blocks skip ${from} → ${to}`, () => {
      const result = transition(from, to, ['leadership_system_admin'], makeEntity(), 'skip')
      expect(result.allowed).toBe(false)
    })
  }
})

// ---------------------------------------------------------------------------
// Role checks
// ---------------------------------------------------------------------------

describe('Award/Handoff State Machine — Role Checks', () => {
  it('blocks readonly_stakeholder from advancing', () => {
    const result = transition('awarded_intake_open', 'compliance_in_progress', ['readonly_stakeholder'])
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('permissions'))).toBe(true)
  })

  it('allows commercial_bd to start compliance', () => {
    const result = transition('awarded_intake_open', 'compliance_in_progress', ['commercial_bd'])
    expect(result.allowed).toBe(true)
  })

  it('allows pm_ops to claim handoff', () => {
    const result = transition('handoff_posted', 'pm_claimed', ['pm_ops'])
    expect(result.allowed).toBe(true)
  })

  it('blocks commercial_bd from claiming handoff (PM/Ops only)', () => {
    const result = transition('handoff_posted', 'pm_claimed', ['commercial_bd'])
    expect(result.allowed).toBe(false)
  })

  it('allows leadership to claim handoff', () => {
    const result = transition('handoff_posted', 'pm_claimed', ['leadership_system_admin'])
    expect(result.allowed).toBe(true)
  })

  it('allows pm_ops to close to ops', () => {
    const result = transition('pm_claimed', 'closed_to_ops', ['pm_ops'])
    expect(result.allowed).toBe(true)
  })

  it('blocks estimating from any award transition', () => {
    const result = transition('awarded_intake_open', 'compliance_in_progress', ['estimating'])
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getAvailableTransitions
// ---------------------------------------------------------------------------

describe('Award/Handoff State Machine — Available Transitions', () => {
  it('awarded_intake_open has 1 transition for commercial_bd', () => {
    const transitions = getAvailableTransitions(awardHandoffStateMachine, 'awarded_intake_open', ['commercial_bd'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('compliance_in_progress')
  })

  it('compliance_in_progress has 1 transition for commercial_bd', () => {
    const transitions = getAvailableTransitions(awardHandoffStateMachine, 'compliance_in_progress', ['commercial_bd'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('handoff_posted')
  })

  it('handoff_posted has 1 transition for pm_ops', () => {
    const transitions = getAvailableTransitions(awardHandoffStateMachine, 'handoff_posted', ['pm_ops'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('pm_claimed')
  })

  it('pm_claimed has 1 transition for pm_ops', () => {
    const transitions = getAvailableTransitions(awardHandoffStateMachine, 'pm_claimed', ['pm_ops'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('closed_to_ops')
  })

  it('closed_to_ops has 0 transitions (terminal)', () => {
    const transitions = getAvailableTransitions(awardHandoffStateMachine, 'closed_to_ops', ['leadership_system_admin'])
    expect(transitions.length).toBe(0)
  })
})
