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
// BD_OWNER permissions
// ---------------------------------------------------------------------------

describe('Permission System — BD_OWNER', () => {
  const role: Role[] = ['BD_OWNER']

  it('can view clients', () => {
    expect(hasPermission(role, 'client', 'view')).toBe(true)
  })

  it('can create clients', () => {
    expect(hasPermission(role, 'client', 'create')).toBe(true)
  })

  it('can edit own clients', () => {
    expect(hasPermission(role, 'client', 'edit_owned')).toBe(true)
  })

  it('can advance own clients', () => {
    expect(hasPermission(role, 'client', 'advance_owned')).toBe(true)
  })

  it('cannot edit any client (only owned)', () => {
    expect(hasPermission(role, 'client', 'edit_any')).toBe(false)
  })

  it('cannot archive clients', () => {
    expect(hasPermission(role, 'client', 'archive')).toBe(false)
  })

  it('cannot approve clients', () => {
    expect(hasPermission(role, 'client', 'approve')).toBe(false)
  })

  it('cannot override clients', () => {
    expect(hasPermission(role, 'client', 'override')).toBe(false)
  })

  it('cannot admin clients', () => {
    expect(hasPermission(role, 'client', 'admin')).toBe(false)
  })

  it('can create and edit own pursuits', () => {
    expect(hasPermission(role, 'pursuit', 'create')).toBe(true)
    expect(hasPermission(role, 'pursuit', 'edit_owned')).toBe(true)
  })

  it('can view awards but not edit', () => {
    expect(hasPermission(role, 'award', 'view')).toBe(true)
    expect(hasPermission(role, 'award', 'edit_owned')).toBe(false)
    expect(hasPermission(role, 'award', 'edit_any')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// COM_LEAD permissions
// ---------------------------------------------------------------------------

describe('Permission System — COM_LEAD', () => {
  const role: Role[] = ['COM_LEAD']

  it('has full commercial access on clients', () => {
    const perms = getPermissions(role, 'client')
    expect(perms).toContain('view')
    expect(perms).toContain('create')
    expect(perms).toContain('edit_owned')
    expect(perms).toContain('edit_any')
    expect(perms).toContain('advance_owned')
    expect(perms).toContain('advance_any')
    expect(perms).toContain('approve')
    expect(perms).toContain('override')
    expect(perms).toContain('archive')
  })

  it('cannot admin (only SYS_ADMIN)', () => {
    expect(hasPermission(role, 'client', 'admin')).toBe(false)
  })

  it('can approve and override on all entities', () => {
    for (const entity of ENTITIES) {
      expect(hasPermission(role, entity, 'approve')).toBe(true)
      expect(hasPermission(role, entity, 'override')).toBe(true)
    }
  })

  it('is leadership', () => {
    expect(isLeadership(role)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// EXEC_VIEW permissions
// ---------------------------------------------------------------------------

describe('Permission System — EXEC_VIEW', () => {
  const role: Role[] = ['EXEC_VIEW']

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

  it('cannot edit anything', () => {
    for (const entity of ENTITIES) {
      expect(hasPermission(role, entity, 'edit_owned')).toBe(false)
      expect(hasPermission(role, entity, 'edit_any')).toBe(false)
    }
  })

  it('cannot advance anything', () => {
    for (const entity of ENTITIES) {
      expect(hasPermission(role, entity, 'advance_owned')).toBe(false)
      expect(hasPermission(role, entity, 'advance_any')).toBe(false)
    }
  })

  it('cannot approve, override, archive, or admin', () => {
    const blocked: PermissionType[] = ['approve', 'override', 'archive', 'admin']
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
// SYS_ADMIN permissions
// ---------------------------------------------------------------------------

describe('Permission System — SYS_ADMIN', () => {
  const role: Role[] = ['SYS_ADMIN']

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
// Multi-role — additive permissions
// ---------------------------------------------------------------------------

describe('Permission System — Multi-Role (Additive)', () => {
  it('BD_OWNER + APPROVER can approve clients', () => {
    const roles: Role[] = ['BD_OWNER', 'APPROVER']
    // BD_OWNER alone cannot approve
    expect(hasPermission(['BD_OWNER'], 'client', 'approve')).toBe(false)
    // APPROVER alone can approve
    expect(hasPermission(['APPROVER'], 'client', 'approve')).toBe(true)
    // Combined can approve
    expect(hasPermission(roles, 'client', 'approve')).toBe(true)
  })

  it('BD_OWNER + APPROVER gets union of permissions', () => {
    const roles: Role[] = ['BD_OWNER', 'APPROVER']
    const perms = getPermissions(roles, 'client')
    // From BD_OWNER: view, create, edit_owned, advance_owned
    // From APPROVER: view, approve
    expect(perms).toContain('view')
    expect(perms).toContain('create')
    expect(perms).toContain('edit_owned')
    expect(perms).toContain('advance_owned')
    expect(perms).toContain('approve')
  })

  it('EXEC_VIEW + EST_USER can create estimates (from EST_USER)', () => {
    const roles: Role[] = ['EXEC_VIEW', 'EST_USER']
    expect(hasPermission(roles, 'estimate', 'create')).toBe(true)
    expect(hasPermission(roles, 'estimate', 'view')).toBe(true)
  })

  it('EST_USER + EST_LEAD gets EST_LEAD approve on estimates', () => {
    const roles: Role[] = ['EST_USER', 'EST_LEAD']
    expect(hasPermission(roles, 'estimate', 'approve')).toBe(true)
    expect(hasPermission(roles, 'estimate', 'edit_any')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Role-specific checks
// ---------------------------------------------------------------------------

describe('Permission System — Role-Specific', () => {
  it('OPS_LEAD can approve handoff_packages', () => {
    expect(hasPermission(['OPS_LEAD'], 'handoff_package', 'approve')).toBe(true)
  })

  it('PM_OWNER can create change_orders', () => {
    expect(hasPermission(['PM_OWNER'], 'change_order', 'create')).toBe(true)
  })

  it('COMP_COORD can advance compliance_packets', () => {
    expect(hasPermission(['COMP_COORD'], 'compliance_packet', 'advance_owned')).toBe(true)
    expect(hasPermission(['COMP_COORD'], 'compliance_packet', 'advance_any')).toBe(true)
  })

  it('COM_COORD can edit any client', () => {
    expect(hasPermission(['COM_COORD'], 'client', 'edit_any')).toBe(true)
  })

  it('APPROVER is leadership', () => {
    expect(isLeadership(['APPROVER'])).toBe(true)
  })

  it('BD_OWNER is not leadership', () => {
    expect(isLeadership(['BD_OWNER'])).toBe(false)
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

  it('all 11 roles are defined', () => {
    expect(ROLES).toHaveLength(11)
  })

  it('all 11 entities are defined', () => {
    expect(ENTITIES).toHaveLength(11)
  })
})
