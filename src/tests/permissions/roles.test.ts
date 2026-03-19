import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  getPermissions,
  isLeadership,
  ROLES,
  ENTITIES,
  type Role,
  type Entity,
  type PermissionType,
} from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Structure tests
// ---------------------------------------------------------------------------

describe('Permission System — Structure (ERP-14)', () => {
  it('has 8 roles', () => {
    expect(ROLES).toHaveLength(8)
  })

  it('roles match ERP-14', () => {
    expect([...ROLES]).toEqual([
      'leadership_system_admin', 'commercial_bd', 'estimating', 'pm_ops',
      'team_lead', 'technician', 'admin_finance', 'readonly_stakeholder',
    ])
  })

  it('has 11 entities matching ERP-12', () => {
    expect(ENTITIES).toHaveLength(11)
  })

  it('entities include ERP-12 record inventory', () => {
    const expected = [
      'client', 'contact', 'project_signal', 'pursuit', 'estimate',
      'proposal', 'award_handoff', 'project', 'mobilization',
      'change_order', 'expansion_task',
    ]
    expect([...ENTITIES]).toEqual(expected)
  })

  it('old phantom entities are removed', () => {
    const entities = [...ENTITIES]
    expect(entities).not.toContain('decision_record')
    expect(entities).not.toContain('compliance_packet')
    expect(entities).not.toContain('handoff_package')
    expect(entities).not.toContain('expansion_opportunity')
  })

  it('old roles are removed', () => {
    const roles = [...ROLES]
    expect(roles).not.toContain('SYS_ADMIN')
    expect(roles).not.toContain('COM_LEAD')
    expect(roles).not.toContain('BD_OWNER')
    expect(roles).not.toContain('COM_COORD')
    expect(roles).not.toContain('EST_LEAD')
    expect(roles).not.toContain('EST_USER')
    expect(roles).not.toContain('OPS_LEAD')
    expect(roles).not.toContain('PM_OWNER')
    expect(roles).not.toContain('COMP_COORD')
    expect(roles).not.toContain('APPROVER')
    expect(roles).not.toContain('EXEC_VIEW')
  })
})

// ---------------------------------------------------------------------------
// leadership_system_admin — all permissions on all entities
// ---------------------------------------------------------------------------

describe('Permission System — leadership_system_admin', () => {
  const role: Role[] = ['leadership_system_admin']

  it('has every permission on every entity', () => {
    const allPerms: PermissionType[] = [
      'view', 'create', 'edit_owned', 'edit_any',
      'advance_owned', 'advance_any', 'approve', 'override', 'archive', 'admin',
    ]
    for (const entity of ENTITIES) {
      for (const perm of allPerms) {
        expect(hasPermission(role, entity, perm)).toBe(true)
      }
    }
  })

  it('is leadership', () => {
    expect(isLeadership(role)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// commercial_bd — Client, Contact, Signal, Pursuit, Proposal, Expansion
// ---------------------------------------------------------------------------

describe('Permission System — commercial_bd', () => {
  const role: Role[] = ['commercial_bd']

  it('has full access on clients (view through archive)', () => {
    const perms = getPermissions(role, 'client')
    expect(perms).toContain('view')
    expect(perms).toContain('create')
    expect(perms).toContain('edit_owned')
    expect(perms).toContain('edit_any')
    expect(perms).toContain('approve')
    expect(perms).toContain('archive')
  })

  it('cannot admin clients', () => {
    expect(hasPermission(role, 'client', 'admin')).toBe(false)
  })

  it('can create and advance pursuits', () => {
    expect(hasPermission(role, 'pursuit', 'create')).toBe(true)
    expect(hasPermission(role, 'pursuit', 'advance_owned')).toBe(true)
  })

  it('can only view estimates (no pricing edits)', () => {
    expect(hasPermission(role, 'estimate', 'view')).toBe(true)
    expect(hasPermission(role, 'estimate', 'create')).toBe(false)
    expect(hasPermission(role, 'estimate', 'edit_owned')).toBe(false)
  })

  it('can view but not edit award_handoff', () => {
    expect(hasPermission(role, 'award_handoff', 'view')).toBe(true)
    expect(hasPermission(role, 'award_handoff', 'edit_owned')).toBe(false)
  })

  it('can create expansion tasks', () => {
    expect(hasPermission(role, 'expansion_task', 'create')).toBe(true)
  })

  it('is not leadership', () => {
    expect(isLeadership(role)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// estimating — Estimate build, pricing, proposal, CO pricing
// ---------------------------------------------------------------------------

describe('Permission System — estimating', () => {
  const role: Role[] = ['estimating']

  it('has full estimate access including approve', () => {
    const perms = getPermissions(role, 'estimate')
    expect(perms).toContain('view')
    expect(perms).toContain('create')
    expect(perms).toContain('edit_owned')
    expect(perms).toContain('edit_any')
    expect(perms).toContain('approve')
  })

  it('can create and edit proposals', () => {
    expect(hasPermission(role, 'proposal', 'create')).toBe(true)
    expect(hasPermission(role, 'proposal', 'edit_owned')).toBe(true)
  })

  it('can view upstream context (clients, pursuits)', () => {
    expect(hasPermission(role, 'client', 'view')).toBe(true)
    expect(hasPermission(role, 'pursuit', 'view')).toBe(true)
  })

  it('cannot create clients or pursuits', () => {
    expect(hasPermission(role, 'client', 'create')).toBe(false)
    expect(hasPermission(role, 'pursuit', 'create')).toBe(false)
  })

  it('can approve change order pricing', () => {
    expect(hasPermission(role, 'change_order', 'approve')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// pm_ops — Project activation through closeout
// ---------------------------------------------------------------------------

describe('Permission System — pm_ops', () => {
  const role: Role[] = ['pm_ops']

  it('has full project access including approve', () => {
    const perms = getPermissions(role, 'project')
    expect(perms).toContain('view')
    expect(perms).toContain('create')
    expect(perms).toContain('edit_owned')
    expect(perms).toContain('approve')
  })

  it('can create and manage mobilizations', () => {
    expect(hasPermission(role, 'mobilization', 'create')).toBe(true)
    expect(hasPermission(role, 'mobilization', 'edit_owned')).toBe(true)
    expect(hasPermission(role, 'mobilization', 'advance_owned')).toBe(true)
  })

  it('can create change orders but not approve pricing', () => {
    expect(hasPermission(role, 'change_order', 'create')).toBe(true)
    expect(hasPermission(role, 'change_order', 'approve')).toBe(false)
  })

  it('can view commercial baseline (read-only on estimates/proposals)', () => {
    expect(hasPermission(role, 'estimate', 'view')).toBe(true)
    expect(hasPermission(role, 'estimate', 'edit_owned')).toBe(false)
    expect(hasPermission(role, 'proposal', 'view')).toBe(true)
    expect(hasPermission(role, 'proposal', 'edit_owned')).toBe(false)
  })

  it('can edit award_handoff ops fields', () => {
    expect(hasPermission(role, 'award_handoff', 'edit_owned')).toBe(true)
    expect(hasPermission(role, 'award_handoff', 'advance_owned')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// team_lead — Field execution, limited visibility
// ---------------------------------------------------------------------------

describe('Permission System — team_lead', () => {
  const role: Role[] = ['team_lead']

  it('can view assigned mobilizations', () => {
    expect(hasPermission(role, 'mobilization', 'view')).toBe(true)
    expect(hasPermission(role, 'mobilization', 'edit_owned')).toBe(true)
  })

  it('can view projects', () => {
    expect(hasPermission(role, 'project', 'view')).toBe(true)
  })

  it('cannot view client or pursuit details', () => {
    expect(hasPermission(role, 'client', 'view')).toBe(false)
    expect(hasPermission(role, 'pursuit', 'view')).toBe(false)
  })

  it('has no approval rights', () => {
    for (const entity of ENTITIES) {
      expect(hasPermission(role, entity, 'approve')).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// technician — Field execution only
// ---------------------------------------------------------------------------

describe('Permission System — technician', () => {
  const role: Role[] = ['technician']

  it('can only view mobilizations', () => {
    expect(hasPermission(role, 'mobilization', 'view')).toBe(true)
  })

  it('cannot view clients, pursuits, or estimates', () => {
    expect(hasPermission(role, 'client', 'view')).toBe(false)
    expect(hasPermission(role, 'pursuit', 'view')).toBe(false)
    expect(hasPermission(role, 'estimate', 'view')).toBe(false)
  })

  it('cannot create or edit anything', () => {
    for (const entity of ENTITIES) {
      expect(hasPermission(role, entity, 'create')).toBe(false)
      expect(hasPermission(role, entity, 'edit_owned')).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// admin_finance — Accounting, reimbursements
// ---------------------------------------------------------------------------

describe('Permission System — admin_finance', () => {
  const role: Role[] = ['admin_finance']

  it('can view most entities', () => {
    for (const entity of ['client', 'contact', 'pursuit', 'estimate', 'proposal', 'project'] as Entity[]) {
      expect(hasPermission(role, entity, 'view')).toBe(true)
    }
  })

  it('can edit own project records (finance fields)', () => {
    expect(hasPermission(role, 'project', 'edit_owned')).toBe(true)
  })

  it('cannot create commercial records', () => {
    expect(hasPermission(role, 'client', 'create')).toBe(false)
    expect(hasPermission(role, 'pursuit', 'create')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// readonly_stakeholder — Visibility only
// ---------------------------------------------------------------------------

describe('Permission System — readonly_stakeholder', () => {
  const role: Role[] = ['readonly_stakeholder']

  it('can view all entities', () => {
    for (const entity of ENTITIES) {
      expect(hasPermission(role, entity, 'view')).toBe(true)
    }
  })

  it('cannot create anything', () => {
    for (const entity of ENTITIES) {
      expect(hasPermission(role, entity, 'create')).toBe(false)
    }
  })

  it('cannot edit, advance, approve, or archive anything', () => {
    const blocked: PermissionType[] = ['edit_owned', 'edit_any', 'advance_owned', 'advance_any', 'approve', 'override', 'archive', 'admin']
    for (const entity of ENTITIES) {
      for (const perm of blocked) {
        expect(hasPermission(role, entity, perm)).toBe(false)
      }
    }
  })

  it('is not leadership', () => {
    expect(isLeadership(role)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Multi-role — additive permissions
// ---------------------------------------------------------------------------

describe('Permission System — Multi-Role (Additive)', () => {
  it('commercial_bd + estimating can create estimates (from estimating)', () => {
    const roles: Role[] = ['commercial_bd', 'estimating']
    expect(hasPermission(roles, 'estimate', 'create')).toBe(true)
    expect(hasPermission(roles, 'estimate', 'view')).toBe(true)
  })

  it('pm_ops + estimating can approve CO pricing (from estimating)', () => {
    const roles: Role[] = ['pm_ops', 'estimating']
    expect(hasPermission(['pm_ops'], 'change_order', 'approve')).toBe(false)
    expect(hasPermission(roles, 'change_order', 'approve')).toBe(true)
  })

  it('readonly_stakeholder + commercial_bd can create clients (from commercial_bd)', () => {
    const roles: Role[] = ['readonly_stakeholder', 'commercial_bd']
    expect(hasPermission(roles, 'client', 'create')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Permission System — Edge Cases', () => {
  it('empty roles array has no permissions', () => {
    for (const entity of ENTITIES) {
      expect(hasPermission([], entity, 'view')).toBe(false)
    }
  })
})
