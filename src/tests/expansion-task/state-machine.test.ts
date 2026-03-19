import { describe, it, expect } from 'vitest'
import { validateTransition, getAvailableTransitions } from '@/lib/state-machines/engine'
import {
  expansionTaskStateMachine,
  EXPANSION_TASK_STATES,
  EXPANSION_TASK_STATE_LABELS,
} from '@/lib/state-machines/expansion-task'
import type { ExpansionTaskState } from '@/lib/state-machines/expansion-task'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'exp-1',
    owner: 'marcus-johnson',
    due_date: '2026-04-10',
    next_action_date: '2026-04-05',
    completion_outcome: 'Thank-you package sent and received.',
    next_signal_created: false,
    next_signal_id: null,
    ...overrides,
  }
}

function transition(
  from: ExpansionTaskState,
  to: ExpansionTaskState,
  roles: Role[] = ['commercial_bd'],
  entity: Record<string, unknown> = makeEntity(),
  reason?: string,
) {
  return validateTransition(expansionTaskStateMachine, {
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

describe('Expansion Task State Machine — Structure', () => {
  it('has 5 states', () => {
    expect(EXPANSION_TASK_STATES).toHaveLength(5)
  })

  it('has labels for every state', () => {
    for (const state of EXPANSION_TASK_STATES) {
      expect(EXPANSION_TASK_STATE_LABELS[state]).toBeDefined()
    }
  })

  it('initial state is open', () => {
    expect(expansionTaskStateMachine.initialState).toBe('open')
  })

  it('terminal states are complete and cancelled', () => {
    expect(expansionTaskStateMachine.terminalStates).toEqual(['complete', 'cancelled'])
  })
})

// ---------------------------------------------------------------------------
// Happy-path transitions
// ---------------------------------------------------------------------------

describe('Expansion Task State Machine — Happy Path', () => {
  it('open → in_progress', () => {
    const result = transition('open', 'in_progress')
    expect(result.allowed).toBe(true)
  })

  it('in_progress → waiting', () => {
    const result = transition('in_progress', 'waiting')
    expect(result.allowed).toBe(true)
  })

  it('in_progress → complete', () => {
    const result = transition('in_progress', 'complete')
    expect(result.allowed).toBe(true)
  })

  it('in_progress → cancelled (with reason)', () => {
    const result = transition('in_progress', 'cancelled', ['commercial_bd'], makeEntity(), 'Client no longer interested')
    expect(result.allowed).toBe(true)
  })

  it('waiting → in_progress', () => {
    const result = transition('waiting', 'in_progress')
    expect(result.allowed).toBe(true)
  })

  it('waiting → cancelled (with reason)', () => {
    const result = transition('waiting', 'cancelled', ['commercial_bd'], makeEntity(), 'No longer relevant')
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Blocked transitions
// ---------------------------------------------------------------------------

describe('Expansion Task State Machine — Blocked Transitions', () => {
  it('open → in_progress blocked without owner', () => {
    const entity = makeEntity({ owner: '' })
    const result = transition('open', 'in_progress', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('owner'))).toBe(true)
  })

  it('open → in_progress blocked without due_date', () => {
    const entity = makeEntity({ due_date: '' })
    const result = transition('open', 'in_progress', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('due_date'))).toBe(true)
  })

  it('in_progress → waiting blocked without next_action_date', () => {
    const entity = makeEntity({ next_action_date: null })
    const result = transition('in_progress', 'waiting', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('next_action_date'))).toBe(true)
  })

  it('in_progress → complete blocked without completion_outcome', () => {
    const entity = makeEntity({ completion_outcome: null })
    const result = transition('in_progress', 'complete', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('completion_outcome'))).toBe(true)
  })

  it('in_progress → complete blocked when next_signal_created=true but no signal_id', () => {
    const entity = makeEntity({ next_signal_created: true, next_signal_id: null })
    const result = transition('in_progress', 'complete', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('signal'))).toBe(true)
  })

  it('in_progress → complete allowed when next_signal_created=true and signal_id exists', () => {
    const entity = makeEntity({ next_signal_created: true, next_signal_id: 'sig-001' })
    const result = transition('in_progress', 'complete', ['commercial_bd'], entity)
    expect(result.allowed).toBe(true)
  })

  it('in_progress → cancelled blocked without reason', () => {
    const result = transition('in_progress', 'cancelled', ['commercial_bd'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
  })

  it('waiting → cancelled blocked without reason', () => {
    const result = transition('waiting', 'cancelled', ['commercial_bd'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
  })

  it('complete is terminal — no transitions', () => {
    const result = transition('complete', 'open', ['leadership_system_admin'])
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('terminal'))).toBe(true)
  })

  it('cancelled is terminal — no transitions', () => {
    const result = transition('cancelled', 'open', ['leadership_system_admin'])
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('terminal'))).toBe(true)
  })

  it('no direct jump from open → complete', () => {
    const result = transition('open', 'complete', ['leadership_system_admin'])
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Role checks
// ---------------------------------------------------------------------------

describe('Expansion Task — Role Checks', () => {
  it('Technician cannot start work', () => {
    const result = transition('open', 'in_progress', ['technician'])
    expect(result.allowed).toBe(false)
  })

  it('PM/Ops can start work', () => {
    const result = transition('open', 'in_progress', ['pm_ops'])
    expect(result.allowed).toBe(true)
  })

  it('PM/Ops cannot cancel (only BD/Leadership)', () => {
    const result = transition('in_progress', 'cancelled', ['pm_ops'], makeEntity(), 'some reason')
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Available transitions
// ---------------------------------------------------------------------------

describe('Expansion Task — Available Transitions', () => {
  it('open shows start work', () => {
    const transitions = getAvailableTransitions(expansionTaskStateMachine, 'open', ['commercial_bd'])
    expect(transitions.map((t) => t.toState)).toContain('in_progress')
  })

  it('in_progress shows waiting, complete, and cancelled for BD', () => {
    const transitions = getAvailableTransitions(expansionTaskStateMachine, 'in_progress', ['commercial_bd'])
    const targets = transitions.map((t) => t.toState)
    expect(targets).toContain('waiting')
    expect(targets).toContain('complete')
    expect(targets).toContain('cancelled')
  })

  it('complete shows no transitions', () => {
    const transitions = getAvailableTransitions(expansionTaskStateMachine, 'complete', ['leadership_system_admin'])
    expect(transitions).toHaveLength(0)
  })
})
