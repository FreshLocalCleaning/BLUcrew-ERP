import { describe, it, expect } from 'vitest'
import { validateTransition, getAvailableTransitions } from '@/lib/state-machines/engine'
import {
  changeOrderStateMachine,
  CHANGE_ORDER_STATES,
  CHANGE_ORDER_STATE_LABELS,
} from '@/lib/state-machines/change-order'
import type { ChangeOrderState } from '@/lib/state-machines/change-order'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'co-1',
    scope_delta: 'Added exterior window cleaning scope',
    fact_packet_by: 'cullen',
    priced_by: 'antonio',
    pricing_delta: { original_value: 25000, revised_value: 27500, delta: 2500 },
    client_response_date: '2026-04-01',
    rejection_reason: null,
    approval_notes: null,
    release_notes: null,
    ...overrides,
  }
}

function transition(
  from: ChangeOrderState,
  to: ChangeOrderState,
  roles: Role[] = ['leadership_system_admin'],
  entity: Record<string, unknown> = makeEntity(),
  reason?: string,
) {
  return validateTransition(changeOrderStateMachine, {
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

describe('Change Order State Machine — Structure', () => {
  it('has 7 states', () => {
    expect(CHANGE_ORDER_STATES).toHaveLength(7)
  })

  it('has labels for every state', () => {
    for (const state of CHANGE_ORDER_STATES) {
      expect(CHANGE_ORDER_STATE_LABELS[state]).toBeDefined()
    }
  })

  it('initial state is draft', () => {
    expect(changeOrderStateMachine.initialState).toBe('draft')
  })

  it('terminal state is closed', () => {
    expect(changeOrderStateMachine.terminalStates).toEqual(['closed'])
  })
})

// ---------------------------------------------------------------------------
// Happy-path transitions
// ---------------------------------------------------------------------------

describe('Change Order State Machine — Happy Path', () => {
  it('draft → internal_review (PM/Ops)', () => {
    const result = transition('draft', 'internal_review', ['pm_ops'])
    expect(result.allowed).toBe(true)
  })

  it('internal_review → client_pending (Commercial/BD)', () => {
    const result = transition('internal_review', 'client_pending', ['commercial_bd'])
    expect(result.allowed).toBe(true)
  })

  it('internal_review → client_pending (Estimating)', () => {
    const result = transition('internal_review', 'client_pending', ['estimating'])
    expect(result.allowed).toBe(true)
  })

  it('internal_review → draft (Estimating, return for rework)', () => {
    const result = transition('internal_review', 'draft', ['estimating'], makeEntity(), 'Needs more detail')
    expect(result.allowed).toBe(true)
  })

  it('client_pending → approved (Commercial/BD)', () => {
    const result = transition('client_pending', 'approved', ['commercial_bd'])
    expect(result.allowed).toBe(true)
  })

  it('client_pending → rejected (Commercial/BD)', () => {
    const entity = makeEntity({ rejection_reason: 'Client declined scope addition' })
    const result = transition('client_pending', 'rejected', ['commercial_bd'], entity)
    expect(result.allowed).toBe(true)
  })

  it('approved → released (PM/Ops)', () => {
    const result = transition('approved', 'released', ['pm_ops'])
    expect(result.allowed).toBe(true)
  })

  it('released → closed (Admin/Finance)', () => {
    const result = transition('released', 'closed', ['admin_finance'])
    expect(result.allowed).toBe(true)
  })

  it('rejected → draft (PM/Ops, reopen for rework)', () => {
    const result = transition('rejected', 'draft', ['pm_ops'], makeEntity(), 'Revising scope for resubmission')
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Blocked transitions
// ---------------------------------------------------------------------------

describe('Change Order State Machine — Blocked Transitions', () => {
  it('draft → internal_review blocked without scope_delta', () => {
    const entity = makeEntity({ scope_delta: '' })
    const result = transition('draft', 'internal_review', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('scope_delta'))).toBe(true)
  })

  it('draft → internal_review blocked without fact_packet_by', () => {
    const entity = makeEntity({ fact_packet_by: '' })
    const result = transition('draft', 'internal_review', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('fact_packet_by'))).toBe(true)
  })

  it('internal_review → client_pending blocked without pricing_delta', () => {
    const entity = makeEntity({ pricing_delta: null })
    const result = transition('internal_review', 'client_pending', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('pricing_delta'))).toBe(true)
  })

  it('internal_review → client_pending blocked without priced_by', () => {
    const entity = makeEntity({ priced_by: null })
    const result = transition('internal_review', 'client_pending', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('priced_by'))).toBe(true)
  })

  it('client_pending → approved blocked without client_response_date', () => {
    const entity = makeEntity({ client_response_date: null })
    const result = transition('client_pending', 'approved', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('client_response_date'))).toBe(true)
  })

  it('client_pending → rejected blocked without rejection_reason', () => {
    const entity = makeEntity({ rejection_reason: null })
    const result = transition('client_pending', 'rejected', ['commercial_bd'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('rejection_reason'))).toBe(true)
  })

  it('internal_review → draft (rework) blocked without reason', () => {
    const result = transition('internal_review', 'draft', ['estimating'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
  })

  it('rejected → draft (reopen) blocked without reason', () => {
    const result = transition('rejected', 'draft', ['pm_ops'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
  })

  it('closed is terminal — no transitions', () => {
    const result = transition('closed', 'draft', ['leadership_system_admin'])
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('terminal'))).toBe(true)
  })

  it('no direct jump from draft → approved', () => {
    const result = transition('draft', 'approved', ['leadership_system_admin'])
    expect(result.allowed).toBe(false)
  })

  it('no direct jump from draft → released', () => {
    const result = transition('draft', 'released', ['leadership_system_admin'])
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Pricing permission: PM cannot price
// ---------------------------------------------------------------------------

describe('Change Order — Pricing Permission', () => {
  it('PM cannot self-approve price (priced_by === fact_packet_by)', () => {
    const entity = makeEntity({
      fact_packet_by: 'cullen',
      priced_by: 'cullen',
    })
    const result = transition('internal_review', 'client_pending', ['leadership_system_admin'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('cannot also price'))).toBe(true)
  })

  it('different user can price (priced_by !== fact_packet_by)', () => {
    const entity = makeEntity({
      fact_packet_by: 'cullen',
      priced_by: 'antonio',
    })
    const result = transition('internal_review', 'client_pending', ['leadership_system_admin'], entity)
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Role checks
// ---------------------------------------------------------------------------

describe('Change Order — Role Checks', () => {
  it('Technician cannot submit for internal review', () => {
    const result = transition('draft', 'internal_review', ['technician'])
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('permissions'))).toBe(true)
  })

  it('PM/Ops cannot send to client (pricing approval)', () => {
    const result = transition('internal_review', 'client_pending', ['pm_ops'])
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('permissions'))).toBe(true)
  })

  it('Estimating cannot approve client decision', () => {
    const result = transition('client_pending', 'approved', ['estimating'])
    expect(result.allowed).toBe(false)
  })

  it('PM/Ops cannot close (only Admin/Finance or Leadership)', () => {
    const result = transition('released', 'closed', ['pm_ops'])
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Available transitions
// ---------------------------------------------------------------------------

describe('Change Order — Available Transitions', () => {
  it('draft shows submit for internal review', () => {
    const transitions = getAvailableTransitions(changeOrderStateMachine, 'draft', ['pm_ops'])
    expect(transitions.map((t) => t.toState)).toContain('internal_review')
  })

  it('internal_review shows client_pending and draft for estimating', () => {
    const transitions = getAvailableTransitions(changeOrderStateMachine, 'internal_review', ['estimating'])
    const targets = transitions.map((t) => t.toState)
    expect(targets).toContain('client_pending')
    expect(targets).toContain('draft')
  })

  it('closed shows no transitions', () => {
    const transitions = getAvailableTransitions(changeOrderStateMachine, 'closed', ['leadership_system_admin'])
    expect(transitions).toHaveLength(0)
  })
})
