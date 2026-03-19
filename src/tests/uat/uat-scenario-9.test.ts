/**
 * UAT Scenario 9 — Permission boundaries
 * Verify every role against entity × permission matrix per ERP-14
 */
import { describe, it, expect } from 'vitest'
import { hasPermission } from '@/lib/permissions/roles'
import { validateTransition } from '@/lib/state-machines/engine'
import { pursuitStateMachine } from '@/lib/state-machines/pursuit'
import { awardHandoffStateMachine } from '@/lib/state-machines/award-handoff'
import { changeOrderStateMachine } from '@/lib/state-machines/change-order'
import { mobilizationStateMachine } from '@/lib/state-machines/mobilization'
import type { Role } from '@/lib/permissions/roles'

describe('UAT Scenario 9 — Permission Boundaries', () => {
  // Technician
  it('Technician cannot advance a Pursuit', () => {
    const result = validateTransition(pursuitStateMachine, {
      currentState: 'project_signal_received', targetState: 'qualification_underway',
      entity: { client_id: 'c1', project_name: 'Test' }, actorRoles: ['technician'],
    })
    expect(result.allowed).toBe(false)
  })

  it('Technician cannot create a Client', () => {
    expect(hasPermission(['technician'], 'client', 'create')).toBe(false)
  })

  it('Technician can only view mobilizations', () => {
    expect(hasPermission(['technician'], 'mobilization', 'view')).toBe(true)
    expect(hasPermission(['technician'], 'mobilization', 'create')).toBe(false)
    expect(hasPermission(['technician'], 'mobilization', 'advance_owned')).toBe(false)
  })

  // Estimating
  it('Estimating cannot claim a Handoff', () => {
    const result = validateTransition(awardHandoffStateMachine, {
      currentState: 'handoff_posted', targetState: 'pm_claimed',
      entity: { pm_claim_user_id: 'est-1' }, actorRoles: ['estimating'],
    })
    expect(result.allowed).toBe(false)
  })

  it('Estimating can approve estimates but not proposals', () => {
    expect(hasPermission(['estimating'], 'estimate', 'approve')).toBe(true)
    expect(hasPermission(['estimating'], 'proposal', 'approve')).toBe(false)
  })

  // PM cannot self-approve CO pricing
  it('PM cannot self-approve CO pricing', () => {
    const entity = {
      scope_delta: 'Test', fact_packet_by: 'cullen',
      pricing_delta: { original_value: 1000, revised_value: 1500, delta: 500 },
      priced_by: 'cullen', // same as fact_packet_by
    }
    const result = validateTransition(changeOrderStateMachine, {
      currentState: 'internal_review', targetState: 'client_pending',
      entity, actorRoles: ['leadership_system_admin'],
    })
    expect(result.allowed).toBe(false)
    expect(result.errors.some(e => e.includes('cannot also price'))).toBe(true)
  })

  // Read-only stakeholder
  it('Read-only stakeholder cannot create anything', () => {
    const entities = ['client', 'contact', 'project_signal', 'pursuit', 'estimate', 'proposal', 'award_handoff', 'project', 'mobilization', 'change_order', 'expansion_task'] as const
    for (const entity of entities) {
      expect(hasPermission(['readonly_stakeholder'], entity, 'create')).toBe(false)
    }
  })

  it('Read-only stakeholder can view everything', () => {
    const entities = ['client', 'contact', 'project_signal', 'pursuit', 'estimate', 'proposal', 'award_handoff', 'project', 'mobilization', 'change_order', 'expansion_task'] as const
    for (const entity of entities) {
      expect(hasPermission(['readonly_stakeholder'], entity, 'view')).toBe(true)
    }
  })

  // Team Lead
  it('Team Lead can edit owned mobilizations but not create', () => {
    expect(hasPermission(['team_lead'], 'mobilization', 'edit_owned')).toBe(true)
    expect(hasPermission(['team_lead'], 'mobilization', 'create')).toBe(false)
  })

  it('Team Lead cannot access commercial entities', () => {
    expect(hasPermission(['team_lead'], 'client', 'view')).toBe(false)
    expect(hasPermission(['team_lead'], 'pursuit', 'view')).toBe(false)
    expect(hasPermission(['team_lead'], 'estimate', 'view')).toBe(false)
  })

  // Admin/Finance
  it('Admin/Finance can view but not create commercial entities', () => {
    expect(hasPermission(['admin_finance'], 'client', 'view')).toBe(true)
    expect(hasPermission(['admin_finance'], 'client', 'create')).toBe(false)
    expect(hasPermission(['admin_finance'], 'estimate', 'approve')).toBe(false)
  })

  it('Admin/Finance cannot advance CO pricing to client', () => {
    const entity = {
      scope_delta: 'Test', fact_packet_by: 'cullen',
      pricing_delta: { original_value: 1000, revised_value: 1500, delta: 500 },
      priced_by: 'antonio',
    }
    const result = validateTransition(changeOrderStateMachine, {
      currentState: 'internal_review', targetState: 'client_pending',
      entity, actorRoles: ['admin_finance'],
    })
    expect(result.allowed).toBe(false)
  })

  // Leadership has full access
  it('Leadership has full permissions on all entities', () => {
    const entities = ['client', 'contact', 'project_signal', 'pursuit', 'estimate', 'proposal', 'award_handoff', 'project', 'mobilization', 'change_order', 'expansion_task'] as const
    const perms = ['view', 'create', 'edit_owned', 'edit_any', 'approve', 'override', 'archive', 'admin'] as const
    for (const entity of entities) {
      for (const perm of perms) {
        expect(hasPermission(['leadership_system_admin'], entity, perm)).toBe(true)
      }
    }
  })

  // Multi-role (Antonio = Leadership + Commercial/BD + Estimating)
  it('Multi-role user gets additive permissions', () => {
    const antonioRoles: Role[] = ['leadership_system_admin', 'commercial_bd', 'estimating']
    expect(hasPermission(antonioRoles, 'estimate', 'approve')).toBe(true)
    expect(hasPermission(antonioRoles, 'client', 'archive')).toBe(true)
    expect(hasPermission(antonioRoles, 'project', 'admin')).toBe(true)
  })
})
