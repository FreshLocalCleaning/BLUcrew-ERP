/**
 * Generic State Machine Engine
 *
 * Pure logic — no database dependency.
 * Validates transitions, checks roles, required fields, blockers,
 * approval gates, reason requirements, and declares side effects.
 */

import type { Role } from '@/lib/permissions/roles'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransitionDef<TState extends string> {
  /** Which states this transition can originate from */
  fromStates: TState[]
  /** The target state */
  toState: TState
  /** Fields that must be non-empty on the entity for the transition to proceed */
  requiredFields: string[]
  /** Roles that are authorized to execute this transition */
  requiredRoles: Role[]
  /** Side effects to trigger after a successful transition */
  sideEffects: string[]
  /**
   * Functions that return a blocker message if the transition should be
   * blocked, or null if clear.
   */
  blockers: ((entity: Record<string, unknown>) => string | null)[]
  /** Whether this transition requires an approval gate */
  requiresApproval: boolean
  /** Whether a reason string is mandatory for this transition */
  requiresReason: boolean
  /** Human-readable label for this transition */
  label: string
}

export interface StateMachineDef<TState extends string> {
  /** The name of the entity this machine governs */
  entityType: string
  /** All possible states */
  states: readonly TState[]
  /** The initial state for newly created entities */
  initialState: TState
  /** Terminal states — no transitions out */
  terminalStates: TState[]
  /** All defined transitions */
  transitions: TransitionDef<TState>[]
}

export interface TransitionRequest {
  /** Current state of the entity */
  currentState: string
  /** Desired target state */
  targetState: string
  /** The entity data (for field and blocker checks) */
  entity: Record<string, unknown>
  /** Roles held by the acting user */
  actorRoles: Role[]
  /** Reason provided for the transition (may be required) */
  reason?: string
  /** Whether an approval has been granted (for approval gates) */
  approvalGranted?: boolean
}

export interface TransitionResult {
  allowed: boolean
  errors: string[]
  sideEffects: string[]
  transition?: TransitionDef<string>
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Validate a state transition against a machine definition.
 * Returns a result object indicating whether the transition is allowed
 * and, if not, explicit error messages explaining why.
 */
export function validateTransition<TState extends string>(
  machine: StateMachineDef<TState>,
  request: TransitionRequest,
): TransitionResult {
  const errors: string[] = []

  // 1. Find matching transition definition
  const transition = machine.transitions.find(
    (t) =>
      t.fromStates.includes(request.currentState as TState) &&
      t.toState === request.targetState,
  )

  if (!transition) {
    // Check if currentState is terminal
    if (machine.terminalStates.includes(request.currentState as TState)) {
      errors.push(
        `State "${request.currentState}" is terminal — no transitions allowed.`,
      )
    } else {
      errors.push(
        `No transition defined from "${request.currentState}" to "${request.targetState}".`,
      )
    }
    return { allowed: false, errors, sideEffects: [] }
  }

  // 2. Role check
  const hasRole = transition.requiredRoles.some((role) =>
    request.actorRoles.includes(role),
  )
  if (!hasRole) {
    errors.push(
      `Insufficient permissions. Required roles: ${transition.requiredRoles.join(', ')}. ` +
        `Actor roles: ${request.actorRoles.join(', ')}.`,
    )
  }

  // 3. Required fields check
  for (const field of transition.requiredFields) {
    const value = request.entity[field]
    if (value === undefined || value === null || value === '') {
      errors.push(`Required field "${field}" is missing or empty.`)
    }
    // Also check empty arrays
    if (Array.isArray(value) && value.length === 0) {
      errors.push(`Required field "${field}" must have at least one entry.`)
    }
  }

  // 4. Blocker checks
  for (const blockerFn of transition.blockers) {
    const msg = blockerFn(request.entity)
    if (msg) {
      errors.push(msg)
    }
  }

  // 5. Approval gate
  if (transition.requiresApproval && !request.approvalGranted) {
    errors.push('This transition requires approval before it can proceed.')
  }

  // 6. Reason requirement
  if (transition.requiresReason && (!request.reason || request.reason.trim() === '')) {
    errors.push('A reason is required for this transition.')
  }

  return {
    allowed: errors.length === 0,
    errors,
    sideEffects: errors.length === 0 ? transition.sideEffects : [],
    transition: errors.length === 0 ? transition : undefined,
  }
}

/**
 * Get all valid target states from a given current state for a given set of roles.
 * Does NOT evaluate entity-specific blockers — use validateTransition for that.
 */
export function getAvailableTransitions<TState extends string>(
  machine: StateMachineDef<TState>,
  currentState: TState,
  actorRoles: Role[],
): TransitionDef<TState>[] {
  return machine.transitions.filter(
    (t) =>
      t.fromStates.includes(currentState) &&
      t.requiredRoles.some((role) => actorRoles.includes(role)),
  )
}
