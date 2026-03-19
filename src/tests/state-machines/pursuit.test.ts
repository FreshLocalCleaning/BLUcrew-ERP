import { describe, it, expect } from 'vitest'
import { validateTransition, getAvailableTransitions } from '@/lib/state-machines/engine'
import { pursuitStateMachine, PURSUIT_STAGES, PURSUIT_STAGE_LABELS } from '@/lib/state-machines/pursuit'
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

// ---------------------------------------------------------------------------
// Machine definition
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Definition', () => {
  it('has 10 states', () => {
    expect(PURSUIT_STAGES.length).toBe(10)
  })

  it('initial state is project_signal_received', () => {
    expect(pursuitStateMachine.initialState).toBe('project_signal_received')
  })

  it('terminal state is no_bid', () => {
    expect(pursuitStateMachine.terminalStates).toEqual(['no_bid'])
  })

  it('has labels for all states', () => {
    for (const state of PURSUIT_STAGES) {
      expect(PURSUIT_STAGE_LABELS[state]).toBeDefined()
      expect(typeof PURSUIT_STAGE_LABELS[state]).toBe('string')
    }
  })

  it('entity type is pursuit', () => {
    expect(pursuitStateMachine.entityType).toBe('pursuit')
  })
})

// ---------------------------------------------------------------------------
// Forward progression (happy path)
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Forward Progression', () => {
  const happyPath: [string, string][] = [
    ['project_signal_received', 'qualification_underway'],
    ['qualification_underway', 'site_walk_scheduled'],
    ['site_walk_scheduled', 'site_walk_complete'],
    ['site_walk_complete', 'closeout_plan_drafted'],
    ['closeout_plan_drafted', 'closeout_plan_approved'],
    ['closeout_plan_approved', 'scope_development'],
    ['scope_development', 'internal_review'],
    ['internal_review', 'estimate_ready'],
  ]

  for (const [from, to] of happyPath) {
    it(`allows ${from} → ${to}`, () => {
      const result = validateTransition(pursuitStateMachine, {
        currentState: from,
        targetState: to,
        entity: makeEntity(),
        actorRoles: ['COM_LEAD'] as Role[],
        approvalGranted: true,
      })
      expect(result.allowed).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  }
})

// ---------------------------------------------------------------------------
// No-bid from every active stage
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — No-Bid Transitions', () => {
  const noBidFrom = [
    'project_signal_received',
    'qualification_underway',
    'site_walk_scheduled',
    'site_walk_complete',
    'closeout_plan_drafted',
    'closeout_plan_approved',
    'scope_development',
    'internal_review',
  ]

  for (const from of noBidFrom) {
    it(`allows no-bid from ${from} with reason`, () => {
      const result = validateTransition(pursuitStateMachine, {
        currentState: from,
        targetState: 'no_bid',
        entity: makeEntity(),
        actorRoles: ['COM_LEAD'] as Role[],
        reason: 'Out of scope',
      })
      expect(result.allowed).toBe(true)
    })

    it(`blocks no-bid from ${from} without reason`, () => {
      const result = validateTransition(pursuitStateMachine, {
        currentState: from,
        targetState: 'no_bid',
        entity: makeEntity(),
        actorRoles: ['COM_LEAD'] as Role[],
      })
      expect(result.allowed).toBe(false)
      expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
    })
  }
})

// ---------------------------------------------------------------------------
// Terminal state
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Terminal State', () => {
  it('blocks any transition from no_bid', () => {
    const result = validateTransition(pursuitStateMachine, {
      currentState: 'no_bid',
      targetState: 'project_signal_received',
      entity: makeEntity(),
      actorRoles: ['SYS_ADMIN'] as Role[],
    })
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('terminal'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Blocked transitions (invalid jumps)
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Blocked Transitions', () => {
  const invalidJumps: [string, string][] = [
    ['project_signal_received', 'estimate_ready'],
    ['project_signal_received', 'site_walk_complete'],
    ['qualification_underway', 'estimate_ready'],
    ['site_walk_scheduled', 'closeout_plan_approved'],
    ['estimate_ready', 'project_signal_received'],
  ]

  for (const [from, to] of invalidJumps) {
    it(`blocks ${from} → ${to}`, () => {
      const result = validateTransition(pursuitStateMachine, {
        currentState: from,
        targetState: to,
        entity: makeEntity(),
        actorRoles: ['SYS_ADMIN'] as Role[],
      })
      expect(result.allowed).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  }
})

// ---------------------------------------------------------------------------
// Role checks
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Role Checks', () => {
  it('blocks transition for EXEC_VIEW (view-only role)', () => {
    const result = validateTransition(pursuitStateMachine, {
      currentState: 'project_signal_received',
      targetState: 'qualification_underway',
      entity: makeEntity(),
      actorRoles: ['EXEC_VIEW'] as Role[],
    })
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('permissions'))).toBe(true)
  })

  it('allows transition for BD_OWNER', () => {
    const result = validateTransition(pursuitStateMachine, {
      currentState: 'project_signal_received',
      targetState: 'qualification_underway',
      entity: makeEntity(),
      actorRoles: ['BD_OWNER'] as Role[],
    })
    expect(result.allowed).toBe(true)
  })

  it('allows transition for SYS_ADMIN', () => {
    const result = validateTransition(pursuitStateMachine, {
      currentState: 'project_signal_received',
      targetState: 'qualification_underway',
      entity: makeEntity(),
      actorRoles: ['SYS_ADMIN'] as Role[],
    })
    expect(result.allowed).toBe(true)
  })

  it('blocks EST_USER from advancing pursuits', () => {
    const result = validateTransition(pursuitStateMachine, {
      currentState: 'project_signal_received',
      targetState: 'qualification_underway',
      entity: makeEntity(),
      actorRoles: ['EST_USER'] as Role[],
    })
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Required fields
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Required Fields', () => {
  it('requires client_id and project_name for signal → qualification', () => {
    const result = validateTransition(pursuitStateMachine, {
      currentState: 'project_signal_received',
      targetState: 'qualification_underway',
      entity: { id: 'pur-1', client_id: '', project_name: '' },
      actorRoles: ['COM_LEAD'] as Role[],
    })
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('client_id'))).toBe(true)
    expect(result.errors.some((e) => e.includes('project_name'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Approval gate
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Approval Gate', () => {
  it('blocks closeout_plan_drafted → approved without approval', () => {
    const result = validateTransition(pursuitStateMachine, {
      currentState: 'closeout_plan_drafted',
      targetState: 'closeout_plan_approved',
      entity: makeEntity(),
      actorRoles: ['COM_LEAD'] as Role[],
      approvalGranted: false,
    })
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('approval'))).toBe(true)
  })

  it('allows closeout_plan_drafted → approved with approval', () => {
    const result = validateTransition(pursuitStateMachine, {
      currentState: 'closeout_plan_drafted',
      targetState: 'closeout_plan_approved',
      entity: makeEntity(),
      actorRoles: ['COM_LEAD'] as Role[],
      approvalGranted: true,
    })
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Return to scope (internal_review → scope_development)
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Return to Scope', () => {
  it('allows internal_review → scope_development with reason', () => {
    const result = validateTransition(pursuitStateMachine, {
      currentState: 'internal_review',
      targetState: 'scope_development',
      entity: makeEntity(),
      actorRoles: ['COM_LEAD'] as Role[],
      reason: 'Needs more detail',
    })
    expect(result.allowed).toBe(true)
  })

  it('blocks internal_review → scope_development without reason', () => {
    const result = validateTransition(pursuitStateMachine, {
      currentState: 'internal_review',
      targetState: 'scope_development',
      entity: makeEntity(),
      actorRoles: ['COM_LEAD'] as Role[],
    })
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Available transitions
// ---------------------------------------------------------------------------

describe('Pursuit State Machine — Available Transitions', () => {
  it('returns 2 transitions from project_signal_received for COM_LEAD', () => {
    const transitions = getAvailableTransitions(
      pursuitStateMachine,
      'project_signal_received',
      ['COM_LEAD'] as Role[],
    )
    expect(transitions.length).toBe(2)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['no_bid', 'qualification_underway'])
  })

  it('returns 0 transitions from no_bid', () => {
    const transitions = getAvailableTransitions(
      pursuitStateMachine,
      'no_bid',
      ['SYS_ADMIN'] as Role[],
    )
    expect(transitions.length).toBe(0)
  })

  it('returns 3 transitions from internal_review for COM_LEAD', () => {
    const transitions = getAvailableTransitions(
      pursuitStateMachine,
      'internal_review',
      ['COM_LEAD'] as Role[],
    )
    expect(transitions.length).toBe(3)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['estimate_ready', 'no_bid', 'scope_development'])
  })

  it('filters by role — EXEC_VIEW gets no transitions', () => {
    const transitions = getAvailableTransitions(
      pursuitStateMachine,
      'project_signal_received',
      ['EXEC_VIEW'] as Role[],
    )
    expect(transitions.length).toBe(0)
  })
})
