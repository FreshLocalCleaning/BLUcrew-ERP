/**
 * BLU Crew ERP — 8-Role Permission System (ERP-14)
 *
 * Pure logic — no database dependency.
 * A single user can hold multiple roles; permissions are additive.
 * Approval rights are per-role, not a standalone APPROVER role.
 */

// ---------------------------------------------------------------------------
// Roles (ERP-14 Table 21)
// ---------------------------------------------------------------------------

export const ROLES = [
  'leadership_system_admin',
  'commercial_bd',
  'estimating',
  'pm_ops',
  'team_lead',
  'technician',
  'admin_finance',
  'readonly_stakeholder',
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
// Entities (ERP-12 record inventory)
// ---------------------------------------------------------------------------

export const ENTITIES = [
  'client',
  'contact',
  'project_signal',
  'pursuit',
  'estimate',
  'proposal',
  'award_handoff',
  'project',
  'mobilization',
  'change_order',
  'expansion_task',
] as const

export type Entity = (typeof ENTITIES)[number]

// ---------------------------------------------------------------------------
// Permission matrix (ERP-14 Table 21 + Table 22)
// ---------------------------------------------------------------------------

type PermissionMatrix = Record<Role, Partial<Record<Entity, PermissionType[]>>>

const matrix: PermissionMatrix = {
  // Leadership / System Admin — all records, all actions, all overrides
  leadership_system_admin: Object.fromEntries(
    ENTITIES.map((e) => [e, [...PERMISSION_TYPES]]),
  ) as Record<Entity, PermissionType[]>,

  // Commercial / BD — Client development, pursuits, delivery strategy, growth
  commercial_bd: {
    client: ['view', 'create', 'edit_owned', 'edit_any', 'advance_owned', 'advance_any', 'approve', 'override', 'archive'],
    contact: ['view', 'create', 'edit_owned', 'edit_any'],
    project_signal: ['view', 'create', 'edit_owned', 'advance_owned', 'override'],
    pursuit: ['view', 'create', 'edit_owned', 'edit_any', 'advance_owned', 'advance_any'],
    estimate: ['view'],
    proposal: ['view', 'create', 'edit_owned', 'advance_owned'],
    award_handoff: ['view'],
    project: ['view'],
    mobilization: ['view'],
    change_order: ['view', 'create', 'edit_owned'],
    expansion_task: ['view', 'create', 'edit_owned', 'advance_owned'],
  },

  // Estimating — Estimate build, pricing, proposal package, CO pricing
  estimating: {
    client: ['view'],
    contact: ['view'],
    project_signal: ['view'],
    pursuit: ['view'],
    estimate: ['view', 'create', 'edit_owned', 'edit_any', 'advance_owned', 'advance_any', 'approve'],
    proposal: ['view', 'create', 'edit_owned', 'edit_any'],
    award_handoff: ['view'],
    project: ['view'],
    mobilization: ['view'],
    change_order: ['view', 'edit_owned', 'approve'],
    expansion_task: ['view'],
  },

  // PM / Ops — Project activation through closeout
  pm_ops: {
    client: ['view'],
    contact: ['view', 'create', 'edit_owned'],
    project_signal: ['view'],
    pursuit: ['view'],
    estimate: ['view'],
    proposal: ['view'],
    award_handoff: ['view', 'edit_owned', 'edit_any', 'advance_owned', 'advance_any'],
    project: ['view', 'create', 'edit_owned', 'edit_any', 'advance_owned', 'advance_any', 'approve'],
    mobilization: ['view', 'create', 'edit_owned', 'edit_any', 'advance_owned', 'advance_any'],
    change_order: ['view', 'create', 'edit_owned', 'advance_owned'],
    expansion_task: ['view', 'create', 'edit_owned'],
  },

  // Team Lead — Field execution and reporting input
  team_lead: {
    client: [],
    contact: [],
    project_signal: [],
    pursuit: [],
    estimate: [],
    proposal: [],
    award_handoff: [],
    project: ['view'],
    mobilization: ['view', 'edit_owned'],
    change_order: ['view'],
    expansion_task: [],
  },

  // Technician — Field execution only
  technician: {
    client: [],
    contact: [],
    project_signal: [],
    pursuit: [],
    estimate: [],
    proposal: [],
    award_handoff: [],
    project: [],
    mobilization: ['view'],
    change_order: [],
    expansion_task: [],
  },

  // Admin / Finance — Accounting, reimbursements, vendor docs
  admin_finance: {
    client: ['view'],
    contact: ['view'],
    project_signal: ['view'],
    pursuit: ['view'],
    estimate: ['view'],
    proposal: ['view'],
    award_handoff: ['view'],
    project: ['view', 'edit_owned'],
    mobilization: ['view'],
    change_order: ['view'],
    expansion_task: ['view'],
  },

  // Read-only stakeholder — Visibility only
  readonly_stakeholder: Object.fromEntries(
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
 * Leadership role that can perform privileged operations.
 */
export const LEADERSHIP_ROLES: Role[] = ['leadership_system_admin']

/**
 * Check if the actor holds at least one leadership role.
 */
export function isLeadership(roles: Role[]): boolean {
  return roles.some((r) => LEADERSHIP_ROLES.includes(r))
}
