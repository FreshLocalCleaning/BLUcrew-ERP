/**
 * BLU Crew ERP — 11-Role Permission System
 *
 * Pure logic — no database dependency.
 * A single user can hold multiple roles; permissions are additive.
 */

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const ROLES = [
  'SYS_ADMIN',
  'COM_LEAD',
  'BD_OWNER',
  'COM_COORD',
  'EST_LEAD',
  'EST_USER',
  'OPS_LEAD',
  'PM_OWNER',
  'COMP_COORD',
  'APPROVER',
  'EXEC_VIEW',
] as const

export type Role = (typeof ROLES)[number]

// ---------------------------------------------------------------------------
// Permission types
// ---------------------------------------------------------------------------

export const PERMISSION_TYPES = [
  'view',
  'create',
  'edit_owned',
  'edit_any',
  'advance_owned',
  'advance_any',
  'approve',
  'override',
  'archive',
  'admin',
] as const

export type PermissionType = (typeof PERMISSION_TYPES)[number]

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export const ENTITIES = [
  'client',
  'contact',
  'pursuit',
  'estimate',
  'proposal',
  'decision_record',
  'award',
  'compliance_packet',
  'handoff_package',
  'change_order',
  'expansion_opportunity',
] as const

export type Entity = (typeof ENTITIES)[number]

// ---------------------------------------------------------------------------
// Permission matrix
// ---------------------------------------------------------------------------

type PermissionMatrix = Record<Role, Partial<Record<Entity, PermissionType[]>>>

const matrix: PermissionMatrix = {
  SYS_ADMIN: Object.fromEntries(
    ENTITIES.map((e) => [
      e,
      [...PERMISSION_TYPES],
    ]),
  ) as Record<Entity, PermissionType[]>,

  COM_LEAD: Object.fromEntries(
    ENTITIES.map((e) => [
      e,
      ['view', 'create', 'edit_owned', 'edit_any', 'advance_owned', 'advance_any', 'approve', 'override', 'archive'],
    ]),
  ) as Record<Entity, PermissionType[]>,

  BD_OWNER: {
    client: ['view', 'create', 'edit_owned', 'advance_owned'],
    contact: ['view', 'create', 'edit_owned', 'edit_any'],
    pursuit: ['view', 'create', 'edit_owned', 'advance_owned'],
    estimate: ['view', 'create', 'edit_owned'],
    proposal: ['view', 'create', 'edit_owned', 'advance_owned'],
    decision_record: ['view'],
    award: ['view'],
    compliance_packet: ['view'],
    handoff_package: ['view'],
    change_order: ['view', 'create', 'edit_owned'],
    expansion_opportunity: ['view', 'create', 'edit_owned'],
  },

  COM_COORD: {
    client: ['view', 'edit_owned', 'edit_any'],
    contact: ['view', 'create', 'edit_owned', 'edit_any'],
    pursuit: ['view', 'create', 'edit_owned', 'edit_any'],
    estimate: ['view', 'create', 'edit_owned'],
    proposal: ['view', 'create', 'edit_owned', 'edit_any'],
    decision_record: ['view', 'create', 'edit_owned'],
    award: ['view', 'create', 'edit_owned'],
    compliance_packet: ['view', 'create', 'edit_owned'],
    handoff_package: ['view', 'create', 'edit_owned'],
    change_order: ['view', 'create', 'edit_owned'],
    expansion_opportunity: ['view', 'create', 'edit_owned'],
  },

  EST_LEAD: {
    client: ['view'],
    contact: ['view'],
    pursuit: ['view'],
    estimate: ['view', 'create', 'edit_owned', 'edit_any', 'advance_owned', 'advance_any', 'approve'],
    proposal: ['view', 'create', 'edit_owned', 'edit_any'],
    decision_record: ['view'],
    award: ['view'],
    compliance_packet: ['view'],
    handoff_package: ['view'],
    change_order: ['view', 'edit_owned'],
    expansion_opportunity: ['view'],
  },

  EST_USER: {
    client: ['view'],
    contact: ['view'],
    pursuit: ['view'],
    estimate: ['view', 'create', 'edit_owned', 'advance_owned'],
    proposal: ['view'],
    decision_record: ['view'],
    award: ['view'],
    compliance_packet: ['view'],
    handoff_package: ['view'],
    change_order: ['view'],
    expansion_opportunity: ['view'],
  },

  OPS_LEAD: {
    client: ['view'],
    contact: ['view'],
    pursuit: ['view'],
    estimate: ['view'],
    proposal: ['view'],
    decision_record: ['view'],
    award: ['view', 'edit_any'],
    compliance_packet: ['view', 'create', 'edit_owned', 'edit_any', 'advance_owned', 'advance_any'],
    handoff_package: ['view', 'create', 'edit_owned', 'edit_any', 'advance_owned', 'advance_any', 'approve'],
    change_order: ['view', 'create', 'edit_owned', 'edit_any', 'advance_owned'],
    expansion_opportunity: ['view'],
  },

  PM_OWNER: {
    client: ['view'],
    contact: ['view', 'create', 'edit_owned'],
    pursuit: ['view'],
    estimate: ['view'],
    proposal: ['view'],
    decision_record: ['view'],
    award: ['view'],
    compliance_packet: ['view', 'edit_owned'],
    handoff_package: ['view', 'edit_owned', 'advance_owned'],
    change_order: ['view', 'create', 'edit_owned', 'advance_owned'],
    expansion_opportunity: ['view', 'create', 'edit_owned'],
  },

  COMP_COORD: {
    client: ['view'],
    contact: ['view'],
    pursuit: ['view'],
    estimate: ['view'],
    proposal: ['view'],
    decision_record: ['view'],
    award: ['view'],
    compliance_packet: ['view', 'create', 'edit_owned', 'edit_any', 'advance_owned', 'advance_any'],
    handoff_package: ['view'],
    change_order: ['view'],
    expansion_opportunity: ['view'],
  },

  APPROVER: {
    client: ['view', 'approve'],
    contact: ['view'],
    pursuit: ['view', 'approve'],
    estimate: ['view', 'approve'],
    proposal: ['view', 'approve'],
    decision_record: ['view', 'approve'],
    award: ['view', 'approve'],
    compliance_packet: ['view', 'approve'],
    handoff_package: ['view', 'approve'],
    change_order: ['view', 'approve'],
    expansion_opportunity: ['view', 'approve'],
  },

  EXEC_VIEW: Object.fromEntries(
    ENTITIES.map((e) => [e, ['view']]),
  ) as Record<Entity, PermissionType[]>,
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a set of roles grants a specific permission on an entity.
 * Permissions are additive across roles.
 */
export function hasPermission(
  roles: Role[],
  entity: Entity,
  permission: PermissionType,
): boolean {
  return roles.some((role) => {
    const perms = matrix[role]?.[entity]
    return perms?.includes(permission) ?? false
  })
}

/**
 * Get all permissions a set of roles grants on a specific entity.
 */
export function getPermissions(
  roles: Role[],
  entity: Entity,
): PermissionType[] {
  const perms = new Set<PermissionType>()
  for (const role of roles) {
    const rolePerms = matrix[role]?.[entity]
    if (rolePerms) {
      for (const p of rolePerms) {
        perms.add(p)
      }
    }
  }
  return [...perms]
}

/**
 * Get the permission matrix entry for a single role.
 */
export function getRolePermissions(
  role: Role,
): Partial<Record<Entity, PermissionType[]>> {
  return matrix[role]
}

/**
 * Leadership roles that can perform privileged operations.
 */
export const LEADERSHIP_ROLES: Role[] = ['SYS_ADMIN', 'COM_LEAD', 'APPROVER']

/**
 * Check if the actor holds at least one leadership role.
 */
export function isLeadership(roles: Role[]): boolean {
  return roles.some((r) => LEADERSHIP_ROLES.includes(r))
}
