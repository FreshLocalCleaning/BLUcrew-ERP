import { describe, it, expect } from 'vitest'
import { validateTransition, getAvailableTransitions } from '@/lib/state-machines/engine'
import { pursuitStateMachine, PURSUIT_STAGES, PURSUIT_STAGE_LABELS, PURSUIT_ACTIVE_STAGES } from '@/lib/state-machines/pursuit'
import type { PursuitStage } from '@/lib/state-machines/pursuit'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'pur-1',
    project_name: 'Test Project',
    client_id: 'c1',
    client_name: 'Test Client',
    ...overrides,
  }
}

function transition(
  from: PursuitStage,
  to: PursuitStage,
  roles: Role[] = ['commercial_bd'],
  entity: Record<string, unknown> = makeEntity(),
  reason?: string,
) {
  return validateTransition(pursuitStateMachine, {
    currentState: from,
    targetState: to,
    entity,
    actorRoles: roles,
    reason,
  })
}

// ---------------------------------------------------------------------------
// Machine definition (ERP-13 Table 10)
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Structure', () => {
  it('has 12 states (ERP-13)', () => {
    expect(PURSUIT_STAGES.length).toBe(12)
  })

  it('states match ERP-13 Table 10', () => {
    expect([...PURSUIT_STAGES]).toEqual([
      'project_signal_received', 'qualification_underway', 'qualified_pursuit',
      'preconstruction_packet_open', 'site_walk_scheduled', 'site_walk_complete',
      'pursue_no_bid_review', 'blu_closeout_plan_sent', 'estimate_ready',
      'hold', 'dormant', 'no_bid',
    ])
  })

  it('initial state is project_signal_received', () => {
    expect(pursuitStateMachine.initialState).toBe('project_signal_received')
  })

  it('terminal state is no_bid', () => {
    expect(pursuitStateMachine.terminalStates).toEqual(['no_bid'])
  })

  it('has 9 active forward stages', () => {
    expect(PURSUIT_ACTIVE_STAGES).toHaveLength(9)
  })

  it('has labels for all states', () => {
    for (const state of PURSUIT_STAGES) {
      expect(PURSUIT_STAGE_LABELS[state]).toBeDefined()
    }
  })

  it('removed old invented states', () => {
    expect(PURSUIT_STAGES).not.toContain('closeout_plan_drafted')
    expect(PURSUIT_STAGES).not.toContain('closeout_plan_approved')
    expect(PURSUIT_STAGES).not.toContain('scope_development')
    expect(PURSUIT_STAGES).not.toContain('internal_review')
  })
})

// ---------------------------------------------------------------------------
// Forward progression (happy path per ERP-13)
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Forward Progression', () => {
  const happyPath: [PursuitStage, PursuitStage][] = [
    ['project_signal_received', 'qualification_underway'],
    ['qualification_underway', 'qualified_pursuit'],
    ['qualified_pursuit', 'preconstruction_packet_open'],
    ['preconstruction_packet_open', 'site_walk_scheduled'],
    ['site_walk_scheduled', 'site_walk_complete'],
    ['site_walk_complete', 'pursue_no_bid_review'],
    ['pursue_no_bid_review', 'blu_closeout_plan_sent'],
    ['blu_closeout_plan_sent', 'estimate_ready'],
  ]

  for (const [from, to] of happyPath) {
    it(`allows ${from} → ${to}`, () => {
      const result = transition(from, to)
      expect(result.allowed).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  }
})

// ---------------------------------------------------------------------------
// No-bid from multiple stages
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — No-Bid Transitions', () => {
  const noBidFrom: PursuitStage[] = [
    'qualification_underway',
    'qualified_pursuit',
    'pursue_no_bid_review',
    'hold',
    'dormant',
  ]

  for (const from of noBidFrom) {
    it(`allows no-bid from ${from} with reason`, () => {
      const result = transition(from, 'no_bid', ['commercial_bd'], makeEntity(), 'Out of scope')
      expect(result.allowed).toBe(true)
    })

    it(`blocks no-bid from ${from} without reason`, () => {
      const result = transition(from, 'no_bid')
      expect(result.allowed).toBe(false)
      expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
    })
  }
})

// ---------------------------------------------------------------------------
// Hold transitions (can be entered from active stages, requires reason)
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Hold Transitions', () => {
  const holdFrom: PursuitStage[] = [
    'qualification_underway',
    'qualified_pursuit',
    'preconstruction_packet_open',
    'site_walk_scheduled',
    'site_walk_complete',
    'pursue_no_bid_review',
    'blu_closeout_plan_sent',
  ]

  for (const from of holdFrom) {
    it(`allows hold from ${from} with reason`, () => {
      const result = transition(from, 'hold', ['commercial_bd'], makeEntity(), 'Waiting on client')
      expect(result.allowed).toBe(true)
    })

    it(`blocks hold from ${from} without reason`, () => {
      const result = transition(from, 'hold')
      expect(result.allowed).toBe(false)
      expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
    })
  }

  it('hold can return to qualification_underway with reason', () => {
    const result = transition('hold', 'qualification_underway', ['commercial_bd'], makeEntity(), 'Unblocked')
    expect(result.allowed).toBe(true)
  })

  it('hold can return to any prior active stage with reason', () => {
    const returnTargets: PursuitStage[] = [
      'qualification_underway', 'qualified_pursuit', 'preconstruction_packet_open',
      'site_walk_scheduled', 'site_walk_complete', 'pursue_no_bid_review',
      'blu_closeout_plan_sent',
    ]
    for (const target of returnTargets) {
      const result = transition('hold', target, ['commercial_bd'], makeEntity(), 'Resuming')
      expect(result.allowed).toBe(true)
    }
  })

  it('hold can move to dormant with reason', () => {
    const result = transition('hold', 'dormant', ['commercial_bd'], makeEntity(), 'Extended pause')
    expect(result.allowed).toBe(true)
  })

  it('hold can move to no-bid with reason', () => {
    const result = transition('hold', 'no_bid', ['commercial_bd'], makeEntity(), 'Decided against')
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Dormant transitions
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Dormant Transitions', () => {
  it('dormant can return to qualification_underway with reason', () => {
    const result = transition('dormant', 'qualification_underway', ['commercial_bd'], makeEntity(), 'Revived interest')
    expect(result.allowed).toBe(true)
  })

  it('dormant can move to no-bid with reason', () => {
    const result = transition('dormant', 'no_bid', ['commercial_bd'], makeEntity(), 'Fully dead')
    expect(result.allowed).toBe(true)
  })

  it('dormant blocks without reason', () => {
    const result = transition('dormant', 'qualification_underway')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Terminal state
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Terminal State', () => {
  it('blocks any transition from no_bid', () => {
    const result = transition('no_bid', 'qualification_underway', ['leadership_system_admin'], makeEntity(), 'Try again')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('terminal'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Blocked transitions (invalid jumps)
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Blocked Transitions (Invalid Jumps)', () => {
  const invalidJumps: [PursuitStage, PursuitStage][] = [
    ['project_signal_received', 'estimate_ready'],
    ['project_signal_received', 'site_walk_complete'],
    ['qualification_underway', 'estimate_ready'],
    ['site_walk_scheduled', 'pursue_no_bid_review'],
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

describe('Pursuit State Machine — Role Checks', () => {
  it('blocks readonly_stakeholder from advancing', () => {
    const result = transition('project_signal_received', 'qualification_underway', ['readonly_stakeholder'])
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('permissions'))).toBe(true)
  })

  it('allows commercial_bd to advance', () => {
    const result = transition('project_signal_received', 'qualification_underway', ['commercial_bd'])
    expect(result.allowed).toBe(true)
  })

  it('allows leadership_system_admin to advance', () => {
    const result = transition('project_signal_received', 'qualification_underway', ['leadership_system_admin'])
    expect(result.allowed).toBe(true)
  })

  it('blocks technician from advancing', () => {
    const result = transition('project_signal_received', 'qualification_underway', ['technician'])
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Required fields
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Required Fields', () => {
  it('requires client_id and project_name for signal → qualification', () => {
    const result = transition(
      'project_signal_received',
      'qualification_underway',
      ['commercial_bd'],
      { id: 'pur-1', client_id: '', project_name: '' },
    )
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('client_id'))).toBe(true)
    expect(result.errors.some((e) => e.includes('project_name'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Alternate paths (ERP-13 allows skipping site walk)
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Alternate Paths', () => {
  it('allows preconstruction_packet_open → estimate_ready (skip walk)', () => {
    const result = transition('preconstruction_packet_open', 'estimate_ready')
    expect(result.allowed).toBe(true)
  })

  it('allows site_walk_complete → estimate_ready (skip review)', () => {
    const result = transition('site_walk_complete', 'estimate_ready')
    expect(result.allowed).toBe(true)
  })

  it('allows pursue_no_bid_review → estimate_ready (direct)', () => {
    const result = transition('pursue_no_bid_review', 'estimate_ready')
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getAvailableTransitions
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Available Transitions', () => {
  it('project_signal_received has 1 transition for commercial_bd (qualification only)', () => {
    const transitions = getAvailableTransitions(pursuitStateMachine, 'project_signal_received', ['commercial_bd'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('qualification_underway')
  })

  it('qualification_underway has 4 transitions (qualified, hold, dormant, no_bid)', () => {
    const transitions = getAvailableTransitions(pursuitStateMachine, 'qualification_underway', ['commercial_bd'])
    expect(transitions.length).toBe(4)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['dormant', 'hold', 'no_bid', 'qualified_pursuit'])
  })

  it('hold has 9 transitions (7 active stages + dormant + no_bid)', () => {
    const transitions = getAvailableTransitions(pursuitStateMachine, 'hold', ['commercial_bd'])
    expect(transitions.length).toBe(9)
  })

  it('no_bid has 0 transitions (terminal)', () => {
    const transitions = getAvailableTransitions(pursuitStateMachine, 'no_bid', ['leadership_system_admin'])
    expect(transitions.length).toBe(0)
  })

  it('readonly_stakeholder gets no transitions from any state', () => {
    for (const state of PURSUIT_STAGES) {
      const transitions = getAvailableTransitions(pursuitStateMachine, state, ['readonly_stakeholder'])
      expect(transitions.length).toBe(0)
    }
  })
})

// ---------------------------------------------------------------------------
// Side effects
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Side Effects', () => {
  it('signal → qualification returns notify_bd_qualification_started', () => {
    const result = transition('project_signal_received', 'qualification_underway')
    expect(result.sideEffects).toContain('notify_bd_qualification_started')
  })

  it('blocked transition returns no side effects', () => {
    const result = transition('project_signal_received', 'qualification_underway', ['readonly_stakeholder'])
    expect(result.sideEffects).toHaveLength(0)
  })
})
