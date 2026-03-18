import { describe, it, expect } from 'vitest'
import { validateTransition, getAvailableTransitions } from '@/lib/state-machines/engine'
import { clientStateMachine, CLIENT_STATES, type ClientState } from '@/lib/state-machines/client'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'client-1',
    name: 'Test Client',
    tier: 'enterprise',
    vertical: 'healthcare',
    next_action: 'Schedule intro call',
    contacts: [{ id: 'c1', name: 'John' }],
    won_award_id: 'award-1',
    ...overrides,
  }
}

function transition(
  from: ClientState,
  to: ClientState,
  roles: Role[] = ['COM_LEAD'],
  entity: Record<string, unknown> = makeEntity(),
  reason?: string,
  approvalGranted?: boolean,
) {
  return validateTransition(clientStateMachine, {
    currentState: from,
    targetState: to,
    entity,
    actorRoles: roles,
    reason,
    approvalGranted,
  })
}

// ---------------------------------------------------------------------------
// Machine structure tests
// ---------------------------------------------------------------------------

describe('Client State Machine — Structure', () => {
  it('has 7 defined states', () => {
    expect(CLIENT_STATES).toHaveLength(7)
  })

  it('initial state is watchlist', () => {
    expect(clientStateMachine.initialState).toBe('watchlist')
  })

  it('archived is terminal', () => {
    expect(clientStateMachine.terminalStates).toEqual(['archived'])
  })
})

// ---------------------------------------------------------------------------
// Valid transitions
// ---------------------------------------------------------------------------

describe('Client State Machine — Valid Transitions', () => {
  // Watchlist → Target Client
  it('watchlist → target_client (with tier and vertical)', () => {
    const result = transition('watchlist', 'target_client', ['BD_OWNER'], makeEntity())
    expect(result.allowed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  // Watchlist → Archived (leadership, with reason)
  it('watchlist → archived (COM_LEAD with reason)', () => {
    const result = transition('watchlist', 'archived', ['COM_LEAD'], makeEntity(), 'No longer a fit')
    expect(result.allowed).toBe(true)
  })

  // Target → Developing
  it('target_client → developing_relationship (with next_action and contacts)', () => {
    const result = transition('target_client', 'developing_relationship', ['BD_OWNER'], makeEntity())
    expect(result.allowed).toBe(true)
  })

  // Target → Dormant (with reason)
  it('target_client → dormant (with reason)', () => {
    const result = transition('target_client', 'dormant', ['BD_OWNER'], makeEntity(), 'Unresponsive')
    expect(result.allowed).toBe(true)
  })

  // Target → Archived (leadership with reason)
  it('target_client → archived (leadership with reason)', () => {
    const result = transition('target_client', 'archived', ['COM_LEAD'], makeEntity(), 'Disqualified')
    expect(result.allowed).toBe(true)
  })

  // Developing → Active Customer (with won award)
  it('developing_relationship → active_customer (with won_award_id)', () => {
    const result = transition('developing_relationship', 'active_customer', ['BD_OWNER'], makeEntity())
    expect(result.allowed).toBe(true)
  })

  // Developing → Strategic (with approval)
  it('developing_relationship → strategic_preferred (with approval)', () => {
    const result = transition('developing_relationship', 'strategic_preferred', ['COM_LEAD'], makeEntity(), undefined, true)
    expect(result.allowed).toBe(true)
  })

  // Developing → Dormant (with reason)
  it('developing_relationship → dormant (with reason)', () => {
    const result = transition('developing_relationship', 'dormant', ['BD_OWNER'], makeEntity(), 'Pausing engagement')
    expect(result.allowed).toBe(true)
  })

  // Active → Strategic (with approval)
  it('active_customer → strategic_preferred (with approval)', () => {
    const result = transition('active_customer', 'strategic_preferred', ['COM_LEAD'], makeEntity(), undefined, true)
    expect(result.allowed).toBe(true)
  })

  // Active → Dormant (with reason)
  it('active_customer → dormant (with reason)', () => {
    const result = transition('active_customer', 'dormant', ['BD_OWNER'], makeEntity(), 'Contract ended')
    expect(result.allowed).toBe(true)
  })

  // Strategic → Dormant (leadership with reason)
  it('strategic_preferred → dormant (leadership with reason)', () => {
    const result = transition('strategic_preferred', 'dormant', ['COM_LEAD'], makeEntity(), 'Downgrading')
    expect(result.allowed).toBe(true)
  })

  // Strategic → Active (leadership with reason)
  it('strategic_preferred → active_customer (leadership with reason)', () => {
    const result = transition('strategic_preferred', 'active_customer', ['COM_LEAD'], makeEntity(), 'Reclassifying')
    expect(result.allowed).toBe(true)
  })

  // Dormant → Target (with reason and next_action)
  it('dormant → target_client (with reason and next_action)', () => {
    const result = transition('dormant', 'target_client', ['BD_OWNER'], makeEntity(), 'Re-engaging')
    expect(result.allowed).toBe(true)
  })

  // Dormant → Developing (with reason and next_action)
  it('dormant → developing_relationship (with reason and next_action)', () => {
    const result = transition('dormant', 'developing_relationship', ['BD_OWNER'], makeEntity(), 'Renewed interest')
    expect(result.allowed).toBe(true)
  })

  // Archived → Watchlist (leadership reopen with reason)
  it('archived → watchlist (leadership reopen with reason)', () => {
    const result = transition('archived', 'watchlist', ['COM_LEAD'], makeEntity(), 'Revisiting opportunity')
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Blocked transitions — missing required fields
// ---------------------------------------------------------------------------

describe('Client State Machine — Blocked: Missing Fields', () => {
  it('watchlist → target_client blocked without tier', () => {
    const result = transition('watchlist', 'target_client', ['BD_OWNER'], makeEntity({ tier: '' }))
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('tier'))).toBe(true)
  })

  it('watchlist → target_client blocked without vertical', () => {
    const result = transition('watchlist', 'target_client', ['BD_OWNER'], makeEntity({ vertical: '' }))
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('vertical'))).toBe(true)
  })

  it('target → developing blocked without next_action', () => {
    const result = transition('target_client', 'developing_relationship', ['BD_OWNER'], makeEntity({ next_action: '' }))
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('next_action'))).toBe(true)
  })

  it('target → developing blocked without contacts', () => {
    const result = transition('target_client', 'developing_relationship', ['BD_OWNER'], makeEntity({ contacts: [] }))
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('contact'))).toBe(true)
  })

  it('developing → active blocked without won_award_id', () => {
    const result = transition('developing_relationship', 'active_customer', ['BD_OWNER'], makeEntity({ won_award_id: '' }))
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('award'))).toBe(true)
  })

  it('dormant → target blocked without next_action', () => {
    const result = transition('dormant', 'target_client', ['BD_OWNER'], makeEntity({ next_action: '' }), 'Re-engaging')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('next_action'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Blocked transitions — missing reason
// ---------------------------------------------------------------------------

describe('Client State Machine — Blocked: Missing Reason', () => {
  it('watchlist → archived blocked without reason', () => {
    const result = transition('watchlist', 'archived', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })

  it('target → dormant blocked without reason', () => {
    const result = transition('target_client', 'dormant', ['BD_OWNER'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })

  it('strategic → dormant blocked without reason', () => {
    const result = transition('strategic_preferred', 'dormant', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })

  it('strategic → active blocked without reason', () => {
    const result = transition('strategic_preferred', 'active_customer', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })

  it('dormant → target blocked without reason', () => {
    const result = transition('dormant', 'target_client', ['BD_OWNER'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })

  it('archived → watchlist blocked without reason', () => {
    const result = transition('archived', 'watchlist', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Blocked transitions — insufficient roles
// ---------------------------------------------------------------------------

describe('Client State Machine — Blocked: Insufficient Roles', () => {
  it('watchlist → archived blocked for BD_OWNER (leadership only)', () => {
    const result = transition('watchlist', 'archived', ['BD_OWNER'], makeEntity(), 'Reason')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('permission') || e.toLowerCase().includes('role'))).toBe(true)
  })

  it('target → archived blocked for EST_USER', () => {
    const result = transition('target_client', 'archived', ['EST_USER'], makeEntity(), 'Reason')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('permission') || e.toLowerCase().includes('role'))).toBe(true)
  })

  it('developing → strategic blocked for BD_OWNER (needs leadership)', () => {
    const result = transition('developing_relationship', 'strategic_preferred', ['BD_OWNER'], makeEntity(), undefined, true)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('permission') || e.toLowerCase().includes('role'))).toBe(true)
  })

  it('strategic → dormant blocked for BD_OWNER (leadership only)', () => {
    const result = transition('strategic_preferred', 'dormant', ['BD_OWNER'], makeEntity(), 'Reason')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('permission') || e.toLowerCase().includes('role'))).toBe(true)
  })

  it('strategic → active blocked for BD_OWNER (leadership only)', () => {
    const result = transition('strategic_preferred', 'active_customer', ['BD_OWNER'], makeEntity(), 'Reason')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('permission') || e.toLowerCase().includes('role'))).toBe(true)
  })

  it('archived → watchlist blocked for BD_OWNER (leadership only)', () => {
    const result = transition('archived', 'watchlist', ['BD_OWNER'], makeEntity(), 'Reason')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('permission') || e.toLowerCase().includes('role'))).toBe(true)
  })

  it('EXEC_VIEW cannot advance any transition', () => {
    const result = transition('watchlist', 'target_client', ['EXEC_VIEW'], makeEntity())
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Blocked transitions — approval gate
// ---------------------------------------------------------------------------

describe('Client State Machine — Blocked: Approval Required', () => {
  it('developing → strategic blocked without approval', () => {
    const result = transition('developing_relationship', 'strategic_preferred', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('approval'))).toBe(true)
  })

  it('active → strategic blocked without approval', () => {
    const result = transition('active_customer', 'strategic_preferred', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('approval'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Invalid transitions (no path defined)
// ---------------------------------------------------------------------------

describe('Client State Machine — Invalid Transitions', () => {
  it('watchlist → active_customer is not allowed', () => {
    const result = transition('watchlist', 'active_customer', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('No transition defined'))).toBe(true)
  })

  it('watchlist → developing_relationship is not allowed', () => {
    const result = transition('watchlist', 'developing_relationship', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
  })

  it('active_customer → watchlist is not allowed', () => {
    const result = transition('active_customer', 'watchlist', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
  })

  it('dormant → active_customer is not allowed', () => {
    const result = transition('dormant', 'active_customer', ['COM_LEAD'], makeEntity(), 'Reason')
    expect(result.allowed).toBe(false)
  })

  it('dormant → strategic is not allowed', () => {
    const result = transition('dormant', 'strategic_preferred', ['COM_LEAD'], makeEntity(), 'Reason')
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getAvailableTransitions
// ---------------------------------------------------------------------------

describe('Client State Machine — getAvailableTransitions', () => {
  it('watchlist has 2 transitions for COM_LEAD', () => {
    const transitions = getAvailableTransitions(clientStateMachine, 'watchlist', ['COM_LEAD'])
    expect(transitions).toHaveLength(2)
    const targets = transitions.map((t) => t.toState)
    expect(targets).toContain('target_client')
    expect(targets).toContain('archived')
  })

  it('watchlist has 1 transition for BD_OWNER (cannot archive)', () => {
    const transitions = getAvailableTransitions(clientStateMachine, 'watchlist', ['BD_OWNER'])
    expect(transitions).toHaveLength(1)
    expect(transitions[0]?.toState).toBe('target_client')
  })

  it('archived has 0 transitions for BD_OWNER', () => {
    const transitions = getAvailableTransitions(clientStateMachine, 'archived', ['BD_OWNER'])
    expect(transitions).toHaveLength(0)
  })

  it('archived has 1 transition for COM_LEAD (reopen)', () => {
    const transitions = getAvailableTransitions(clientStateMachine, 'archived', ['COM_LEAD'])
    expect(transitions).toHaveLength(1)
    expect(transitions[0]?.toState).toBe('watchlist')
  })

  it('EXEC_VIEW has 0 transitions from any state', () => {
    for (const state of CLIENT_STATES) {
      const transitions = getAvailableTransitions(clientStateMachine, state, ['EXEC_VIEW'])
      expect(transitions).toHaveLength(0)
    }
  })

  it('multi-role user gets combined transitions', () => {
    // BD_OWNER can go watchlist → target, COM_LEAD can also go watchlist → archived
    const transitions = getAvailableTransitions(clientStateMachine, 'watchlist', ['BD_OWNER', 'COM_LEAD'])
    expect(transitions).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Side effects
// ---------------------------------------------------------------------------

describe('Client State Machine — Side Effects', () => {
  it('watchlist → target returns notify_bd_owner side effect', () => {
    const result = transition('watchlist', 'target_client', ['BD_OWNER'], makeEntity())
    expect(result.sideEffects).toContain('notify_bd_owner')
  })

  it('blocked transition returns no side effects', () => {
    const result = transition('watchlist', 'archived', ['BD_OWNER'], makeEntity(), 'Reason')
    expect(result.sideEffects).toHaveLength(0)
  })
})
