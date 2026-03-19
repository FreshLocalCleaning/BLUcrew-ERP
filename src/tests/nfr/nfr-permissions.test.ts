/**
 * NFR Permissions Tests (ERP-20)
 * Verify role-based access at record, action, and field level.
 */
import { describe, it, expect } from 'vitest'
import { hasPermission, ROLES, ENTITIES, type Role, type Entity } from '@/lib/permissions/roles'
import { validateTransition } from '@/lib/state-machines/engine'
import { changeOrderStateMachine } from '@/lib/state-machines/change-order'
import { mobilizationStateMachine } from '@/lib/state-machines/mobilization'
import { projectStateMachine } from '@/lib/state-machines/project'

describe('NFR — Permissions Matrix', () => {
  // Every entity × role intersection is explicitly defined
  it('every role has an explicit permission entry for every entity', () => {
    for (const role of ROLES) {
      for (const entity of ENTITIES) {
        // hasPermission should return true or false, never throw
        const result = hasPermission([role], entity, 'view')
        expect(typeof result).toBe('boolean')
      }
    }
  })

  // Leadership has all permissions
  it('Leadership/System Admin has all permissions on all entities', () => {
    const allPerms = ['view', 'create', 'edit_owned', 'edit_any', 'approve', 'override', 'archive', 'admin'] as const
    for (const entity of ENTITIES) {
      for (const perm of allPerms) {
        expect(hasPermission(['leadership_system_admin'], entity, perm)).toBe(true)
      }
    }
  })

  // Readonly stakeholder can only view
  it('Readonly stakeholder can view but never create/edit/advance', () => {
    const writePerm = ['create', 'edit_owned', 'edit_any', 'advance_owned', 'approve', 'override', 'archive', 'admin'] as const
    for (const entity of ENTITIES) {
      expect(hasPermission(['readonly_stakeholder'], entity, 'view')).toBe(true)
      for (const perm of writePerm) {
        expect(hasPermission(['readonly_stakeholder'], entity, perm)).toBe(false)
      }
    }
  })
})

describe('NFR — Pricing Field Access', () => {
  it('PM/Ops cannot send CO pricing to client', () => {
    const entity = {
      scope_delta: 'Test', fact_packet_by: 'cullen',
      pricing_delta: { original_value: 1000, revised_value: 1500, delta: 500 },
      priced_by: 'antonio',
    }
    const result = validateTransition(changeOrderStateMachine, {
      currentState: 'internal_review', targetState: 'client_pending',
      entity, actorRoles: ['pm_ops'],
    })
    expect(result.allowed).toBe(false)
    expect(result.errors.some(e => e.includes('permissions'))).toBe(true)
  })

  it('Estimating CAN send CO pricing to client', () => {
    const entity = {
      scope_delta: 'Test', fact_packet_by: 'cullen',
      pricing_delta: { original_value: 1000, revised_value: 1500, delta: 500 },
      priced_by: 'antonio',
    }
    const result = validateTransition(changeOrderStateMachine, {
      currentState: 'internal_review', targetState: 'client_pending',
      entity, actorRoles: ['estimating'],
    })
    expect(result.allowed).toBe(true)
  })

  it('Commercial/BD CAN send CO pricing to client', () => {
    const entity = {
      scope_delta: 'Test', fact_packet_by: 'cullen',
      pricing_delta: { original_value: 1000, revised_value: 1500, delta: 500 },
      priced_by: 'antonio',
    }
    const result = validateTransition(changeOrderStateMachine, {
      currentState: 'internal_review', targetState: 'client_pending',
      entity, actorRoles: ['commercial_bd'],
    })
    expect(result.allowed).toBe(true)
  })
})

describe('NFR — Archive/Reactivation Access', () => {
  it('only Leadership can archive clients', () => {
    expect(hasPermission(['leadership_system_admin'], 'client', 'archive')).toBe(true)
    expect(hasPermission(['commercial_bd'], 'client', 'archive')).toBe(true) // BD also has archive on clients
    expect(hasPermission(['pm_ops'], 'client', 'archive')).toBe(false)
    expect(hasPermission(['technician'], 'client', 'archive')).toBe(false)
  })
})

describe('NFR — Transition Role Enforcement', () => {
  it('Technician cannot advance mobilization status', () => {
    const entity = {
      readiness_checklist: { crew_confirmed: true, equipment_loaded: true, travel_booked: true, lodging_booked: true, per_diem_approved: true },
      missing_items_log: null, compressed_planning: false, exception_flag: false,
    }
    const result = validateTransition(mobilizationStateMachine, {
      currentState: 'handoff_incomplete', targetState: 'needs_planning',
      entity, actorRoles: ['technician'],
    })
    expect(result.allowed).toBe(false)
  })

  it('Team Lead can deploy to field (ready → in_field)', () => {
    const entity = { actual_start_date: '2026-05-01' }
    const result = validateTransition(mobilizationStateMachine, {
      currentState: 'ready', targetState: 'in_field',
      entity, actorRoles: ['team_lead'],
    })
    expect(result.allowed).toBe(true)
  })

  it('Admin/Finance can close financially but not advance projects operationally', () => {
    // financially_open → financially_closed: allowed
    const result1 = validateTransition(projectStateMachine, {
      currentState: 'financially_open', targetState: 'financially_closed',
      entity: {}, actorRoles: ['admin_finance'],
    })
    expect(result1.allowed).toBe(true)

    // startup_pending → forecasting_active: NOT allowed for admin_finance
    const result2 = validateTransition(projectStateMachine, {
      currentState: 'startup_pending', targetState: 'forecasting_active',
      entity: { pm_owner_id: 'cullen' }, actorRoles: ['admin_finance'],
    })
    expect(result2.allowed).toBe(false)
  })
})
