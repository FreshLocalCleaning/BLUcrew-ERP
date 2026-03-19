import { describe, it, expect } from 'vitest'
import { validateTransition, getAvailableTransitions } from '@/lib/state-machines/engine'
import { projectSignalStateMachine, PROJECT_SIGNAL_STATES, type ProjectSignalState } from '@/lib/state-machines/project-signal'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'sig-1',
    project_identity: 'Test Project',
    signal_type: 'referral',
    source_evidence: 'Referral from contact',
    linked_client_id: 'c1',
    linked_contact_id: 'con-1',
    next_action_date: '2026-04-01',
    ...overrides,
  }
}

function transition(
  from: ProjectSignalState,
  to: ProjectSignalState,
  roles: Role[] = ['commercial_bd'],
  entity: Record<string, unknown> = makeEntity(),
  reason?: string,
) {
  return validateTransition(projectSignalStateMachine, {
    currentState: from,
    targetState: to,
    entity,
    actorRoles: roles,
    reason,
  })
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe('Project Signal State Machine — Structure', () => {
  it('has 5 states', () => {
    expect(PROJECT_SIGNAL_STATES).toHaveLength(5)
  })

  it('states are received, under_review, passed, failed, deferred', () => {
    expect([...PROJECT_SIGNAL_STATES]).toEqual([
      'received', 'under_review', 'passed', 'failed', 'deferred',
    ])
  })

  it('initial state is received', () => {
    expect(projectSignalStateMachine.initialState).toBe('received')
  })

  it('has no terminal states (passed signals live as history)', () => {
    expect(projectSignalStateMachine.terminalStates).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Valid transitions
// ---------------------------------------------------------------------------

describe('Project Signal State Machine — Valid Transitions', () => {
  it('received → under_review', () => {
    const result = transition('received', 'under_review')
    expect(result.allowed).toBe(true)
  })

  it('under_review → passed (with all required fields)', () => {
    const result = transition('under_review', 'passed')
    expect(result.allowed).toBe(true)
    expect(result.sideEffects).toContain('enable_pursuit_creation')
  })

  it('under_review → failed (with reason)', () => {
    const result = transition('under_review', 'failed', ['commercial_bd'], makeEntity(), 'Not a real opportunity')
    expect(result.allowed).toBe(true)
  })

  it('under_review → deferred (with reason + next_action_date)', () => {
    const result = transition('under_review', 'deferred', ['commercial_bd'], makeEntity(), 'Client timing unclear')
    expect(result.allowed).toBe(true)
  })

  it('deferred → under_review', () => {
    const result = transition('deferred', 'under_review')
    expect(result.allowed).toBe(true)
  })

  it('failed → under_review (leadership override with reason)', () => {
    const result = transition('failed', 'under_review', ['leadership_system_admin'], makeEntity(), 'New evidence found')
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Blocked: missing required fields
// ---------------------------------------------------------------------------

describe('Project Signal State Machine — Blocked: Missing Fields', () => {
  it('under_review → passed blocked without linked_client_id', () => {
    const result = transition('under_review', 'passed', ['commercial_bd'], makeEntity({ linked_client_id: '' }))
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('linked_client_id'))).toBe(true)
  })

  it('under_review → passed blocked without linked_contact_id', () => {
    const result = transition('under_review', 'passed', ['commercial_bd'], makeEntity({ linked_contact_id: '' }))
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('linked_contact_id'))).toBe(true)
  })

  it('under_review → passed blocked without project_identity', () => {
    const result = transition('under_review', 'passed', ['commercial_bd'], makeEntity({ project_identity: '' }))
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('project_identity'))).toBe(true)
  })

  it('under_review → passed blocked without signal_type', () => {
    const result = transition('under_review', 'passed', ['commercial_bd'], makeEntity({ signal_type: '' }))
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('signal_type'))).toBe(true)
  })

  it('under_review → passed blocked without source_evidence', () => {
    const result = transition('under_review', 'passed', ['commercial_bd'], makeEntity({ source_evidence: '' }))
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('source_evidence'))).toBe(true)
  })

  it('under_review → deferred blocked without next_action_date', () => {
    const result = transition('under_review', 'deferred', ['commercial_bd'], makeEntity({ next_action_date: '' }), 'Deferred reason')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('next_action_date'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Blocked: missing reason
// ---------------------------------------------------------------------------

describe('Project Signal State Machine — Blocked: Missing Reason', () => {
  it('under_review → failed blocked without reason', () => {
    const result = transition('under_review', 'failed')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })

  it('under_review → deferred blocked without reason', () => {
    const result = transition('under_review', 'deferred')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })

  it('failed → under_review blocked without reason (leadership override)', () => {
    const result = transition('failed', 'under_review', ['leadership_system_admin'])
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Blocked: insufficient roles
// ---------------------------------------------------------------------------

describe('Project Signal State Machine — Blocked: Insufficient Roles', () => {
  it('readonly_stakeholder cannot advance signals', () => {
    const result = transition('received', 'under_review', ['readonly_stakeholder'])
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('permission'))).toBe(true)
  })

  it('technician cannot advance signals', () => {
    const result = transition('received', 'under_review', ['technician'])
    expect(result.allowed).toBe(false)
  })

  it('failed → under_review blocked for commercial_bd (leadership only)', () => {
    const result = transition('failed', 'under_review', ['commercial_bd'], makeEntity(), 'Override reason')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('permission'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Invalid transitions (no path defined)
// ---------------------------------------------------------------------------

describe('Project Signal State Machine — Invalid Transitions', () => {
  it('received → passed is not allowed (must go through under_review)', () => {
    const result = transition('received', 'passed', ['leadership_system_admin'])
    expect(result.allowed).toBe(false)
  })

  it('received → failed is not allowed', () => {
    const result = transition('received', 'failed', ['leadership_system_admin'], makeEntity(), 'Reason')
    expect(result.allowed).toBe(false)
  })

  it('passed → failed is not allowed (passed signals are history)', () => {
    const result = transition('passed', 'failed', ['leadership_system_admin'], makeEntity(), 'Reason')
    expect(result.allowed).toBe(false)
  })

  it('deferred → passed is not allowed (must go through under_review)', () => {
    const result = transition('deferred', 'passed', ['leadership_system_admin'])
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getAvailableTransitions
// ---------------------------------------------------------------------------

describe('Project Signal State Machine — Available Transitions', () => {
  it('received has 1 transition for commercial_bd', () => {
    const transitions = getAvailableTransitions(projectSignalStateMachine, 'received', ['commercial_bd'])
    expect(transitions).toHaveLength(1)
    expect(transitions[0]?.toState).toBe('under_review')
  })

  it('under_review has 3 transitions for commercial_bd (passed, failed, deferred)', () => {
    const transitions = getAvailableTransitions(projectSignalStateMachine, 'under_review', ['commercial_bd'])
    expect(transitions).toHaveLength(3)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['deferred', 'failed', 'passed'])
  })

  it('deferred has 1 transition for commercial_bd', () => {
    const transitions = getAvailableTransitions(projectSignalStateMachine, 'deferred', ['commercial_bd'])
    expect(transitions).toHaveLength(1)
    expect(transitions[0]?.toState).toBe('under_review')
  })

  it('failed has 0 transitions for commercial_bd (leadership only)', () => {
    const transitions = getAvailableTransitions(projectSignalStateMachine, 'failed', ['commercial_bd'])
    expect(transitions).toHaveLength(0)
  })

  it('failed has 1 transition for leadership_system_admin', () => {
    const transitions = getAvailableTransitions(projectSignalStateMachine, 'failed', ['leadership_system_admin'])
    expect(transitions).toHaveLength(1)
    expect(transitions[0]?.toState).toBe('under_review')
  })

  it('passed has 0 transitions (lives as linked history)', () => {
    const transitions = getAvailableTransitions(projectSignalStateMachine, 'passed', ['leadership_system_admin'])
    expect(transitions).toHaveLength(0)
  })

  it('readonly_stakeholder gets 0 transitions from any state', () => {
    for (const state of PROJECT_SIGNAL_STATES) {
      const transitions = getAvailableTransitions(projectSignalStateMachine, state, ['readonly_stakeholder'])
      expect(transitions).toHaveLength(0)
    }
  })
})
