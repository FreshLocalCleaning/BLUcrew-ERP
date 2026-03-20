import { z } from 'zod/v4'
import { PROJECT_STATES } from '@/lib/state-machines/project'

// ---------------------------------------------------------------------------
// Enum Zod types
// ---------------------------------------------------------------------------

export const ProjectStateEnum = z.enum(PROJECT_STATES as unknown as [string, ...string[]])

// ---------------------------------------------------------------------------
// Preprocess helpers: convert empty strings from HTML inputs to undefined
// ---------------------------------------------------------------------------

const emptyToUndefined = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional())

// ---------------------------------------------------------------------------
// Create Schema (auto-created from closed_to_ops)
// ---------------------------------------------------------------------------

export const createProjectSchema = z.object({
  linked_award_handoff_id: z.string().min(1, 'Award/Handoff ID is required'),
  linked_client_id: z.string().min(1, 'Client ID is required'),
  project_name: z.string().min(1, 'Project name is required').max(300),
  pm_owner_id: z.string().min(1, 'PM owner is required'),
  commercial_baseline_snapshot: z.record(z.string(), z.unknown()),
  client_stage_map: z.record(z.string(), z.unknown()).nullable().default(null),
  target_turnover_date: z.preprocess((v) => (v === '' ? null : v), z.string().nullable().default(null)),
  billing_references: z.record(z.string(), z.unknown()).nullable().default(null),
  active_change_order_count: z.number().int().min(0).default(0),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updateProjectSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
  pm_owner_id: z.string().min(1).optional(),
  client_stage_map: z.record(z.string(), z.unknown()).nullable().optional(),
  target_turnover_date: z.preprocess((v) => (v === '' ? null : v), z.string().nullable().optional()),
  billing_references: z.record(z.string(), z.unknown()).nullable().optional(),
  active_change_order_count: z.number().int().min(0).optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: emptyToUndefined,
})

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

// ---------------------------------------------------------------------------
// Transition Schema
// ---------------------------------------------------------------------------

export const projectTransitionSchema = z.object({
  project_id: z.string().min(1),
  target_status: ProjectStateEnum,
  reason: z.string().max(2000).optional(),
  approval_granted: z.boolean().optional(),
})

export type ProjectTransitionInput = z.infer<typeof projectTransitionSchema>
