import { describe, it, expect } from 'vitest'
import { validateTransition, getAvailableTransitions } from '@/lib/state-machines/engine'
import {
  mobilizationStateMachine,
  MOBILIZATION_STATES,
  MOBILIZATION_STATE_LABELS,
  checkReadinessGate,
} from '@/lib/state-machines/mobilization'
import type { MobilizationState } from '@/lib/state-machines/mobilization'
import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function defaultChecklist(overrides: Record<string, boolean> = {}) {
  return {
    crew_confirmed: false,
    equipment_loaded: false,
    travel_booked: false,
    lodging_booked: false,
    per_diem_approved: false,
    jobber_synced: false,
    teams_posted: false,
    ...overrides,
  }
}

function fullChecklist() {
  return defaultChecklist({
    crew_confirmed: true,
    equipment_loaded: true,
    travel_booked: true,
    lodging_booked: true,
    per_diem_approved: true,
    jobber_synced: true,
    teams_posted: true,
  })
}

function makeEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mob-1',
    stage_name: 'Trip 1',
    linked_project_id: 'prj-1',
    readiness_checklist: fullChecklist(),
    actual_start_date: '2026-04-07',
    photo_report_link: 'https://sharepoint/photos',
    client_signoff_status: 'obtained',
    qc_stage_completion: { passed: true, reviewer_id: 'cullen', date: '2026-04-11', notes: 'All clean' },
    blocker_reason: null,
    blocker_owner: null,
    missing_items_log: null,
    compressed_planning: false,
    exception_flag: false,
    ...overrides,
  }
}

function transition(
  from: MobilizationState,
  to: MobilizationState,
  roles: Role[] = ['pm_ops'],
  entity: Record<string, unknown> = makeEntity(),
  reason?: string,
) {
  return validateTransition(mobilizationStateMachine, {
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

describe('Mobilization State Machine — Structure', () => {
  it('has 7 states (ERP-13)', () => {
    expect(MOBILIZATION_STATES.length).toBe(7)
  })

  it('states match ERP-13', () => {
    expect([...MOBILIZATION_STATES]).toEqual([
      'handoff_incomplete', 'needs_planning', 'blocked', 'ready',
      'in_field', 'complete', 'cancelled',
    ])
  })

  it('initial state is handoff_incomplete', () => {
    expect(mobilizationStateMachine.initialState).toBe('handoff_incomplete')
  })

  it('terminal states are complete and cancelled', () => {
    expect(mobilizationStateMachine.terminalStates).toEqual(['complete', 'cancelled'])
  })

  it('has labels for all states', () => {
    for (const state of MOBILIZATION_STATES) {
      expect(MOBILIZATION_STATE_LABELS[state]).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// Forward progression (happy path)
// ---------------------------------------------------------------------------

describe('Mobilization State Machine — Forward Progression', () => {
  it('allows handoff_incomplete → needs_planning when missing items resolved', () => {
    const entity = makeEntity({ missing_items_log: null })
    const result = transition('handoff_incomplete', 'needs_planning', ['pm_ops'], entity)
    expect(result.allowed).toBe(true)
  })

  it('allows handoff_incomplete → needs_planning with empty array', () => {
    const entity = makeEntity({ missing_items_log: [] })
    const result = transition('handoff_incomplete', 'needs_planning', ['pm_ops'], entity)
    expect(result.allowed).toBe(true)
  })

  it('blocks handoff_incomplete → needs_planning with unresolved items', () => {
    const entity = makeEntity({ missing_items_log: ['Need crew lead'] })
    const result = transition('handoff_incomplete', 'needs_planning', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('missing item'))).toBe(true)
  })

  it('allows needs_planning → ready with full readiness checklist', () => {
    const result = transition('needs_planning', 'ready')
    expect(result.allowed).toBe(true)
  })

  it('allows ready → in_field with actual_start_date', () => {
    const result = transition('ready', 'in_field')
    expect(result.allowed).toBe(true)
  })

  it('blocks ready → in_field without actual_start_date', () => {
    const entity = makeEntity({ actual_start_date: null })
    const result = transition('ready', 'in_field', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('actual_start_date'))).toBe(true)
  })

  it('allows in_field → complete with all completion requirements', () => {
    const result = transition('in_field', 'complete')
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Readiness Gate
// ---------------------------------------------------------------------------

describe('Mobilization State Machine — Readiness Gate', () => {
  it('blocks needs_planning → ready without crew_confirmed', () => {
    const entity = makeEntity({
      readiness_checklist: defaultChecklist({
        equipment_loaded: true,
        travel_booked: true,
        lodging_booked: true,
        per_diem_approved: true,
      }),
    })
    const result = transition('needs_planning', 'ready', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('crew_confirmed'))).toBe(true)
  })

  it('blocks needs_planning → ready without equipment_loaded', () => {
    const entity = makeEntity({
      readiness_checklist: defaultChecklist({
        crew_confirmed: true,
        travel_booked: true,
        lodging_booked: true,
        per_diem_approved: true,
      }),
    })
    const result = transition('needs_planning', 'ready', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('equipment_loaded'))).toBe(true)
  })

  it('blocks needs_planning → ready without travel_booked', () => {
    const entity = makeEntity({
      readiness_checklist: defaultChecklist({
        crew_confirmed: true,
        equipment_loaded: true,
        lodging_booked: true,
        per_diem_approved: true,
      }),
    })
    const result = transition('needs_planning', 'ready', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('travel_booked'))).toBe(true)
  })

  it('blocks needs_planning → ready without lodging_booked', () => {
    const entity = makeEntity({
      readiness_checklist: defaultChecklist({
        crew_confirmed: true,
        equipment_loaded: true,
        travel_booked: true,
        per_diem_approved: true,
      }),
    })
    const result = transition('needs_planning', 'ready', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('lodging_booked'))).toBe(true)
  })

  it('blocks needs_planning → ready without per_diem_approved', () => {
    const entity = makeEntity({
      readiness_checklist: defaultChecklist({
        crew_confirmed: true,
        equipment_loaded: true,
        travel_booked: true,
        lodging_booked: true,
      }),
    })
    const result = transition('needs_planning', 'ready', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('per_diem_approved'))).toBe(true)
  })

  it('does not require jobber_synced or teams_posted for readiness gate', () => {
    const entity = makeEntity({
      readiness_checklist: defaultChecklist({
        crew_confirmed: true,
        equipment_loaded: true,
        travel_booked: true,
        lodging_booked: true,
        per_diem_approved: true,
        jobber_synced: false,
        teams_posted: false,
      }),
    })
    const result = transition('needs_planning', 'ready', ['pm_ops'], entity)
    expect(result.allowed).toBe(true)
  })

  it('checkReadinessGate returns null when all gate items true', () => {
    const entity = makeEntity({ readiness_checklist: fullChecklist() })
    expect(checkReadinessGate(entity)).toBeNull()
  })

  it('checkReadinessGate returns error when items missing', () => {
    const entity = makeEntity({ readiness_checklist: defaultChecklist() })
    const msg = checkReadinessGate(entity)
    expect(msg).toBeDefined()
    expect(msg).toContain('crew_confirmed')
  })
})

// ---------------------------------------------------------------------------
// Compressed Planning Override
// ---------------------------------------------------------------------------

describe('Mobilization State Machine — Compressed Planning', () => {
  it('allows needs_planning → ready with compressed_planning + exception_flag', () => {
    const entity = makeEntity({
      readiness_checklist: defaultChecklist(), // all false
      compressed_planning: true,
      exception_flag: true,
    })
    const result = transition('needs_planning', 'ready', ['pm_ops'], entity)
    expect(result.allowed).toBe(true)
  })

  it('blocks needs_planning → ready with compressed_planning but no exception_flag', () => {
    const entity = makeEntity({
      readiness_checklist: defaultChecklist(),
      compressed_planning: true,
      exception_flag: false,
    })
    const result = transition('needs_planning', 'ready', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
  })

  it('blocks needs_planning → ready with exception_flag but no compressed_planning', () => {
    const entity = makeEntity({
      readiness_checklist: defaultChecklist(),
      compressed_planning: false,
      exception_flag: true,
    })
    const result = transition('needs_planning', 'ready', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Completion Gate
// ---------------------------------------------------------------------------

describe('Mobilization State Machine — Completion Gate', () => {
  it('blocks in_field → complete without photo_report_link', () => {
    const entity = makeEntity({ photo_report_link: null })
    const result = transition('in_field', 'complete', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('photo_report_link'))).toBe(true)
  })

  it('blocks in_field → complete without client_signoff_status', () => {
    const entity = makeEntity({ client_signoff_status: null })
    const result = transition('in_field', 'complete', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('sign-off'))).toBe(true)
  })

  it('blocks in_field → complete without qc_stage_completion', () => {
    const entity = makeEntity({ qc_stage_completion: null })
    const result = transition('in_field', 'complete', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('QC'))).toBe(true)
  })

  it('allows in_field → complete with all completion requirements', () => {
    const result = transition('in_field', 'complete')
    expect(result.allowed).toBe(true)
    expect(result.sideEffects).toContain('notify_complete')
  })
})

// ---------------------------------------------------------------------------
// Blocked transitions
// ---------------------------------------------------------------------------

describe('Mobilization State Machine — Blocked Transitions', () => {
  it('allows needs_planning → blocked with reason + owner', () => {
    const entity = makeEntity({ blocker_reason: 'Supply shortage', blocker_owner: 'vendor' })
    const result = transition('needs_planning', 'blocked', ['pm_ops'], entity)
    expect(result.allowed).toBe(true)
  })

  it('blocks needs_planning → blocked without blocker_reason', () => {
    const entity = makeEntity({ blocker_reason: null, blocker_owner: 'vendor' })
    const result = transition('needs_planning', 'blocked', ['pm_ops'], entity)
    expect(result.allowed).toBe(false)
  })

  it('allows ready → blocked with reason + owner', () => {
    const entity = makeEntity({ blocker_reason: 'Weather', blocker_owner: 'pm' })
    const result = transition('ready', 'blocked', ['pm_ops'], entity)
    expect(result.allowed).toBe(true)
  })

  it('allows in_field → blocked with reason + owner', () => {
    const entity = makeEntity({ blocker_reason: 'Safety issue', blocker_owner: 'site-super' })
    const result = transition('in_field', 'blocked', ['pm_ops'], entity)
    expect(result.allowed).toBe(true)
  })

  it('allows blocked → needs_planning with reason', () => {
    const result = transition('blocked', 'needs_planning', ['pm_ops'], makeEntity(), 'Resolved supply issue')
    expect(result.allowed).toBe(true)
  })

  it('blocks blocked → needs_planning without reason', () => {
    const result = transition('blocked', 'needs_planning', ['pm_ops'], makeEntity())
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('reason'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Cancelled transitions
// ---------------------------------------------------------------------------

describe('Mobilization State Machine — Cancellation', () => {
  it('allows blocked → cancelled with reason', () => {
    const result = transition('blocked', 'cancelled', ['pm_ops'], makeEntity(), 'Project cancelled')
    expect(result.allowed).toBe(true)
  })

  it('blocks blocked → cancelled without reason', () => {
    const result = transition('blocked', 'cancelled', ['pm_ops'])
    expect(result.allowed).toBe(false)
  })

  it('allows ready → cancelled with reason', () => {
    const result = transition('ready', 'cancelled', ['pm_ops'], makeEntity(), 'Scope changed')
    expect(result.allowed).toBe(true)
  })

  it('blocks ready → cancelled without reason', () => {
    const result = transition('ready', 'cancelled', ['pm_ops'])
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Terminal states — no reuse
// ---------------------------------------------------------------------------

describe('Mobilization State Machine — Terminal States (No Reuse)', () => {
  it('blocks any transition from complete', () => {
    const result = transition('complete', 'needs_planning', ['leadership_system_admin'], makeEntity(), 'Reopen')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('terminal'))).toBe(true)
  })

  it('blocks any transition from cancelled', () => {
    const result = transition('cancelled', 'needs_planning', ['leadership_system_admin'], makeEntity(), 'Reopen')
    expect(result.allowed).toBe(false)
    expect(result.errors.some((e) => e.includes('terminal'))).toBe(true)
  })

  it('complete cannot go to in_field', () => {
    const result = transition('complete', 'in_field', ['leadership_system_admin'], makeEntity(), 'Return trip')
    expect(result.allowed).toBe(false)
  })

  it('cancelled cannot go to handoff_incomplete', () => {
    const result = transition('cancelled', 'handoff_incomplete', ['leadership_system_admin'], makeEntity(), 'Reopen')
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Invalid state jumps
// ---------------------------------------------------------------------------

describe('Mobilization State Machine — Invalid Transitions', () => {
  const invalidJumps: [MobilizationState, MobilizationState][] = [
    ['handoff_incomplete', 'ready'],
    ['handoff_incomplete', 'in_field'],
    ['handoff_incomplete', 'complete'],
    ['handoff_incomplete', 'blocked'],
    ['needs_planning', 'in_field'],
    ['needs_planning', 'complete'],
    ['ready', 'needs_planning'],
    ['ready', 'handoff_incomplete'],
    ['in_field', 'ready'],
    ['in_field', 'needs_planning'],
    ['in_field', 'cancelled'],
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

describe('Mobilization State Machine — Role Checks', () => {
  it('blocks readonly_stakeholder from any transition', () => {
    const result = transition('handoff_incomplete', 'needs_planning', ['readonly_stakeholder'])
    expect(result.allowed).toBe(false)
  })

  it('blocks commercial_bd from advancing mobilization', () => {
    const result = transition('handoff_incomplete', 'needs_planning', ['commercial_bd'])
    expect(result.allowed).toBe(false)
  })

  it('allows pm_ops to advance mobilization', () => {
    const result = transition('handoff_incomplete', 'needs_planning', ['pm_ops'])
    expect(result.allowed).toBe(true)
  })

  it('allows leadership to advance mobilization', () => {
    const result = transition('handoff_incomplete', 'needs_planning', ['leadership_system_admin'])
    expect(result.allowed).toBe(true)
  })

  it('allows team_lead to deploy to field', () => {
    const result = transition('ready', 'in_field', ['team_lead'])
    expect(result.allowed).toBe(true)
  })

  it('blocks team_lead from marking ready', () => {
    const result = transition('needs_planning', 'ready', ['team_lead'])
    expect(result.allowed).toBe(false)
  })

  it('blocks technician from any transition', () => {
    const result = transition('handoff_incomplete', 'needs_planning', ['technician'])
    expect(result.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getAvailableTransitions
// ---------------------------------------------------------------------------

describe('Mobilization State Machine — Available Transitions', () => {
  it('handoff_incomplete has 1 transition for pm_ops', () => {
    const transitions = getAvailableTransitions(mobilizationStateMachine, 'handoff_incomplete', ['pm_ops'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('needs_planning')
  })

  it('needs_planning has 2 transitions for pm_ops (blocked, ready)', () => {
    const transitions = getAvailableTransitions(mobilizationStateMachine, 'needs_planning', ['pm_ops'])
    expect(transitions.length).toBe(2)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['blocked', 'ready'])
  })

  it('ready has 3 transitions for pm_ops', () => {
    const transitions = getAvailableTransitions(mobilizationStateMachine, 'ready', ['pm_ops'])
    expect(transitions.length).toBe(3)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['blocked', 'cancelled', 'in_field'])
  })

  it('in_field has 2 transitions for pm_ops', () => {
    const transitions = getAvailableTransitions(mobilizationStateMachine, 'in_field', ['pm_ops'])
    expect(transitions.length).toBe(2)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['blocked', 'complete'])
  })

  it('complete has 0 transitions (terminal)', () => {
    const transitions = getAvailableTransitions(mobilizationStateMachine, 'complete', ['leadership_system_admin'])
    expect(transitions.length).toBe(0)
  })

  it('cancelled has 0 transitions (terminal)', () => {
    const transitions = getAvailableTransitions(mobilizationStateMachine, 'cancelled', ['leadership_system_admin'])
    expect(transitions.length).toBe(0)
  })

  it('blocked has 2 transitions for pm_ops', () => {
    const transitions = getAvailableTransitions(mobilizationStateMachine, 'blocked', ['pm_ops'])
    expect(transitions.length).toBe(2)
    const targets = transitions.map((t) => t.toState).sort()
    expect(targets).toEqual(['cancelled', 'needs_planning'])
  })

  it('team_lead can only deploy from ready', () => {
    const transitions = getAvailableTransitions(mobilizationStateMachine, 'ready', ['team_lead'])
    expect(transitions.length).toBe(1)
    expect(transitions[0]?.toState).toBe('in_field')
  })
})
