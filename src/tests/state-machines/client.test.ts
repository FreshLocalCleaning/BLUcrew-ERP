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
    tier: 'A',
    vertical: 'general_contractor',
    next_action: 'Schedule intro call',
    contacts: [{ id: 'c1', name: 'John' }],
    won_award_id: 'award-1',
    preferred_provider_candidate: false,
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
  it('has 6 defined states (ERP-13)', () => {
    expect(CLIENT_STATES).toHaveLength(6)
  })

  it('states are watchlist, target_client, developing_relationship, active_client, dormant, archived', () => {
    expect([...CLIENT_STATES]).toEqual([
      'watchlist', 'target_client', 'developing_relationship',
      'active_client', 'dormant', 'archived',
    ])
  })

  it('initial state is watchlist', () => {
    expect(clientStateMachine.initialState).toBe('watchlist')
  })

  it('archived is terminal', () => {
    expect(clientStateMachine.terminalStates).toEqual(['archived'])
  })

  it('strategic_preferred is NOT a state', () => {
    expect(CLIENT_STATES).not.toContain('strategic_preferred')
  })

  it('active_customer is NOT a state (renamed to active_client)', () => {
    expect(CLIENT_STATES).not.toContain('active_customer')
  })
})

// ---------------------------------------------------------------------------
// Valid transitions (ERP-13 Table 9)
// ---------------------------------------------------------------------------

describe('Client State Machine — Valid Transitions', () => {
  // Watchlist
  it('watchlist → target_client (with tier and vertical)', () => {
    const result = transition('watchlist', 'target_client', ['BD_OWNER'], makeEntity())
    expect(result.allowed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('watchlist → archived (COM_LEAD with reason)', () => {
    const result = transition('watchlist', 'archived', ['COM_LEAD'], makeEntity(), 'No longer a fit')
    expect(result.allowed).toBe(true)
  })

  // Target Client
  it('target_client → developing_relationship (with next_action and contacts)', () => {
    const result = transition('target_client', 'developing_relationship', ['BD_OWNER'], makeEntity())
    expect(result.allowed).toBe(true)
  })

  it('target_client → archived (leadership with reason)', () => {
    const result = transition('target_client', 'archived', ['COM_LEAD'], makeEntity(), 'Disqualified')
    expect(result.allowed).toBe(true)
  })

  // Developing Relationship
  it('developing_relationship → active_client (with won_award_id)', () => {
    const result = transition('developing_relationship', 'active_client', ['BD_OWNER'], makeEntity())
    expect(result.allowed).toBe(true)
  })

  it('developing_relationship → dormant (with reason)', () => {
    const result = transition('developing_relationship', 'dormant', ['BD_OWNER'], makeEntity(), 'Pausing engagement')
    expect(result.allowed).toBe(true)
  })

  it('developing_relationship → archived (leadership with reason)', () => {
    const result = transition('developing_relationship', 'archived', ['COM_LEAD'], makeEntity(), 'Bad fit')
    expect(result.allowed).toBe(true)
  })

  // Active Client
  it('active_client → dormant (with reason)', () => {
    const result = transition('active_client', 'dormant', ['BD_OWNER'], makeEntity(), 'Contract ended')
    expect(result.allowed).toBe(true)
  })

  it('active_client → archived (leadership with reason)', () => {
    const result = transition('active_client', 'archived', ['COM_LEAD'], makeEntity(), 'Account closed')
    expect(result.allowed).toBe(true)
  })

  // Dormant
  it('dormant → target_client (with reason and next_action)', () => {
    const result = transition('dormant', 'target_client', ['BD_OWNER'], makeEntity(), 'Re-engaging')
    expect(result.allowed).toBe(true)
  })

  it('dormant → developing_relationship (with reason and next_action)', () => {
    const result = transition('dormant', 'developing_relationship', ['BD_OWNER'], makeEntity(), 'Renewed interest')
    expect(result.allowed).toBe(true)
  })

  it('dormant → archived (leadership with reason)', () => {
    const result = transition('dormant', 'archived', ['COM_LEAD'], makeEntity(), 'Fully retired')
    expect(result.allowed).toBe(true)
  })

  // Archived (admin reactivation)
  it('archived → watchlist (leadership reopen with reason + approval)', () => {
    const result = transition('archived', 'watchlist', ['COM_LEAD'], makeEntity(), 'Revisiting opportunity', true)
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

  it('developing → active_client blocked without won_award_id', () => {
    const result = transition('developing_relationship', 'active_client', ['BD_OWNER'], makeEntity({ won_award_id: '' }))
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

  it('developing → dormant blocked without reason', () => {
    const result = transition('developing_relationship', 'dormant', ['BD_OWNER'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })

  it('active_client → dormant blocked without reason', () => {
    const result = transition('active_client', 'dormant', ['BD_OWNER'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })

  it('active_client → archived blocked without reason', () => {
    const result = transition('active_client', 'archived', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })

  it('dormant → target blocked without reason', () => {
    const result = transition('dormant', 'target_client', ['BD_OWNER'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('reason'))).toBe(true)
  })

  it('archived → watchlist blocked without reason', () => {
    const result = transition('archived', 'watchlist', ['COM_LEAD'], makeEntity(), undefined, true)
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

  it('archived → watchlist blocked for BD_OWNER (leadership only)', () => {
    const result = transition('archived', 'watchlist', ['BD_OWNER'], makeEntity(), 'Reason', true)
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
  it('archived → watchlist blocked without approval (admin reactivation)', () => {
    const result = transition('archived', 'watchlist', ['COM_LEAD'], makeEntity(), 'Reactivating')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('approval'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Invalid transitions (no path defined per ERP-13)
// ---------------------------------------------------------------------------

describe('Client State Machine — Invalid Transitions', () => {
  it('watchlist → active_client is not allowed (must go through target + developing)', () => {
    const result = transition('watchlist', 'active_client', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('No transition defined'))).toBe(true)
  })

  it('watchlist → developing_relationship is not allowed (must go through target)', () => {
    const result = transition('watchlist', 'developing_relationship', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
  })

  it('active_client → watchlist is not allowed', () => {
    const result = transition('active_client', 'watchlist', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
  })

  it('dormant → active_client is not allowed (must go through target or developing)', () => {
    const result = transition('dormant', 'active_client', ['COM_LEAD'], makeEntity(), 'Reason')
    expect(result.allowed).toBe(false)
  })

  it('target_client → active_client is not allowed (must go through developing)', () => {
    const result = transition('target_client', 'active_client', ['COM_LEAD'], makeEntity())
    expect(result.allowed).toBe(false)
  })

  it('active_client → developing_relationship is not allowed (no backward move)', () => {
    const result = transition('active_client', 'developing_relationship', ['COM_LEAD'], makeEntity())
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

  it('developing_relationship has 3 transitions for COM_LEAD', () => {
    const transitions = getAvailableTransitions(clientStateMachine, 'developing_relationship', ['COM_LEAD'])
    expect(transitions).toHaveLength(3)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['active_client', 'archived', 'dormant'])
  })

  it('active_client has 2 transitions for COM_LEAD (dormant, archived)', () => {
    const transitions = getAvailableTransitions(clientStateMachine, 'active_client', ['COM_LEAD'])
    expect(transitions).toHaveLength(2)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['archived', 'dormant'])
  })

  it('dormant has 3 transitions for COM_LEAD', () => {
    const transitions = getAvailableTransitions(clientStateMachine, 'dormant', ['COM_LEAD'])
    expect(transitions).toHaveLength(3)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['archived', 'developing_relationship', 'target_client'])
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

  it('developing → active_client returns notify_ops_new_customer', () => {
    const result = transition('developing_relationship', 'active_client', ['BD_OWNER'], makeEntity())
    expect(result.sideEffects).toContain('notify_ops_new_customer')
  })

  it('blocked transition returns no side effects', () => {
    const result = transition('watchlist', 'archived', ['BD_OWNER'], makeEntity(), 'Reason')
    expect(result.sideEffects).toHaveLength(0)
  })
})
