import { describe, it, expect } from 'vitest'
import { validateTransition, getAvailableTransitions } from '@/lib/state-machines/engine'
import { projectStateMachine, PROJECT_STATES, PROJECT_STATE_LABELS } from '@/lib/state-machines/project'
import type { ProjectState } from '@/lib/state-machines/project'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'prj-1',
    project_name: 'Test Project',
    pm_owner_id: 'cullen',
    mobilization_count: 1,
    open_mobilization_count: 0,
    ...overrides,
  }
}

function transition(
  from: ProjectState,
  to: ProjectState,
  roles: Role[] = ['pm_ops'],
  entity: Record<string, unknown> = makeEntity(),
  reason?: string,
) {
  return validateTransition(projectStateMachine, {
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

describe('Project State Machine — Structure', () => {
  it('has 7 states (ERP-13)', () => {
    expect(PROJECT_STATES.length).toBe(7)
  })

  it('states match ERP-13', () => {
    expect([...PROJECT_STATES]).toEqual([
      'startup_pending', 'forecasting_active', 'execution_active',
      'operationally_complete', 'financially_open', 'financially_closed',
      'dispute_hold',
    ])
  })

  it('initial state is startup_pending', () => {
    expect(projectStateMachine.initialState).toBe('startup_pending')
  })

  it('terminal state is financially_closed', () => {
    expect(projectStateMachine.terminalStates).toEqual(['financially_closed'])
  })

  it('has labels for all states', () => {
    for (const state of PROJECT_STATES) {
      expect(PROJECT_STATE_LABELS[state]).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// Forward progression (happy path)
// ---------------------------------------------------------------------------

describe('Project State Machine — Forward Progression', () => {
  it('allows startup_pending → forecasting_active with pm_owner_id', () => {
    const result = transition('startup_pending', 'forecasting_active')
    expect(result.allowed).toBe(true)
  })

  it('blocks startup_pending → forecasting_active without pm_owner_id', () => {
    const entity = makeEntity({ pm_owner_id: '' })
    const result = transition('startup_pending', 'forecasting_active', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('pm_owner_id'))).toBe(true)
  })

  it('allows forecasting_active → execution_active with mobilizations', () => {
    const result = transition('forecasting_active', 'execution_active')
    expect(result.allowed).toBe(true)
  })

  it('blocks forecasting_active → execution_active without mobilizations', () => {
    const entity = makeEntity({ mobilization_count: 0 })
    const result = transition('forecasting_active', 'execution_active', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('mobilization'))).toBe(true)
  })

  it('allows execution_active → operationally_complete when all mobs done', () => {
    const result = transition('execution_active', 'operationally_complete')
    expect(result.allowed).toBe(true)
  })

  it('blocks execution_active → operationally_complete with open mobs', () => {
    const entity = makeEntity({ open_mobilization_count: 2 })
    const result = transition('execution_active', 'operationally_complete', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('mobilization'))).toBe(true)
  })

  it('allows operationally_complete → financially_open', () => {
    const result = transition('operationally_complete', 'financially_open')
    expect(result.allowed).toBe(true)
  })

  it('allows financially_open → financially_closed', () => {
    const result = transition('financially_open', 'financially_closed', ['admin_finance'])
    expect(result.allowed).toBe(true)
  })

  it('operationally_complete → financially_open has side effect', () => {
    const result = transition('operationally_complete', 'financially_open')
    expect(result.sideEffects).toContain('notify_financially_open')
  })
})

// ---------------------------------------------------------------------------
// Dispute hold transitions
// ---------------------------------------------------------------------------

describe('Project State Machine — Dispute Hold', () => {
  it('allows operationally_complete → dispute_hold with reason', () => {
    const result = transition('operationally_complete', 'dispute_hold', ['pm_ops'], makeEntity(), 'Client dispute')
    expect(result.allowed).toBe(true)
  })

  it('blocks operationally_complete → dispute_hold without reason', () => {
    const result = transition('operationally_complete', 'dispute_hold')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
  })

  it('allows financially_open → dispute_hold with reason', () => {
    const result = transition('financially_open', 'dispute_hold', ['admin_finance'], makeEntity(), 'AR dispute')
    expect(result.allowed).toBe(true)
  })

  it('allows dispute_hold → financially_open with reason (leadership only)', () => {
    const result = transition('dispute_hold', 'financially_open', ['leadership_system_admin'], makeEntity(), 'Resolved')
    expect(result.allowed).toBe(true)
  })

  it('blocks pm_ops from resolving dispute_hold → financially_open', () => {
    const result = transition('dispute_hold', 'financially_open', ['pm_ops'], makeEntity(), 'Try')
    expect(result.allowed).toBe(false)
  })

  it('allows dispute_hold → operationally_complete with reason (leadership only)', () => {
    const result = transition('dispute_hold', 'operationally_complete', ['leadership_system_admin'], makeEntity(), 'Resolved')
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Terminal state
// ---------------------------------------------------------------------------

describe('Project State Machine — Terminal State', () => {
  it('blocks any transition from financially_closed', () => {
    const result = transition('financially_closed', 'financially_open', ['leadership_system_admin'], makeEntity(), 'Reopen')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('terminal'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Invalid transitions
// ---------------------------------------------------------------------------

describe('Project State Machine — Invalid Transitions', () => {
  const invalidJumps: [ProjectState, ProjectState][] = [
    ['startup_pending', 'execution_active'],
    ['startup_pending', 'operationally_complete'],
    ['startup_pending', 'financially_closed'],
    ['forecasting_active', 'operationally_complete'],
    ['forecasting_active', 'financially_closed'],
    ['execution_active', 'financially_open'],
    ['execution_active', 'financially_closed'],
  ]

  for (const [from, to] of invalidJumps) {
    it(`blocks skip ${from} → ${to}`, () => {
      const result = transition(from, to, ['leadership_system_admin'], makeEntity(), 'skip')
      expect(result.allowed).toBe(false)
    })
  }
})

// ---------------------------------------------------------------------------
// Role checks
// ---------------------------------------------------------------------------

describe('Project State Machine — Role Checks', () => {
  it('blocks readonly_stakeholder from advancing', () => {
    const result = transition('startup_pending', 'forecasting_active', ['readonly_stakeholder'])
    expect(result.allowed).toBe(false)
  })

  it('allows pm_ops to advance project', () => {
    const result = transition('startup_pending', 'forecasting_active', ['pm_ops'])
    expect(result.allowed).toBe(true)
  })

  it('allows leadership to advance project', () => {
    const result = transition('startup_pending', 'forecasting_active', ['leadership_system_admin'])
    expect(result.allowed).toBe(true)
  })

  it('blocks commercial_bd from advancing project', () => {
    const result = transition('startup_pending', 'forecasting_active', ['commercial_bd'])
    expect(result.allowed).toBe(false)
  })

  it('allows admin_finance to close financials', () => {
    const result = transition('financially_open', 'financially_closed', ['admin_finance'])
    expect(result.allowed).toBe(true)
  })

  it('blocks pm_ops from closing financials', () => {
    const result = transition('financially_open', 'financially_closed', ['pm_ops'])
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getAvailableTransitions
// ---------------------------------------------------------------------------

describe('Project State Machine — Available Transitions', () => {
  it('startup_pending has 1 transition for pm_ops', () => {
    const transitions = getAvailableTransitions(projectStateMachine, 'startup_pending', ['pm_ops'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('forecasting_active')
  })

  it('forecasting_active has 1 transition for pm_ops', () => {
    const transitions = getAvailableTransitions(projectStateMachine, 'forecasting_active', ['pm_ops'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('execution_active')
  })

  it('execution_active has 1 transition for pm_ops', () => {
    const transitions = getAvailableTransitions(projectStateMachine, 'execution_active', ['pm_ops'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('operationally_complete')
  })

  it('operationally_complete has 2 transitions for pm_ops', () => {
    const transitions = getAvailableTransitions(projectStateMachine, 'operationally_complete', ['pm_ops'])
    expect(transitions.length).toBe(2)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['dispute_hold', 'financially_open'])
  })

  it('financially_closed has 0 transitions (terminal)', () => {
    const transitions = getAvailableTransitions(projectStateMachine, 'financially_closed', ['leadership_system_admin'])
    expect(transitions.length).toBe(0)
  })
})
