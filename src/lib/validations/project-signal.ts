import { z } from 'zod/v4'
import { PROJECT_SIGNAL_STATES } from '@/lib/state-machines/project-signal'
import { PROJECT_SIGNAL_TYPES } from '@/types/commercial'

// ---------------------------------------------------------------------------
// Enum Zod types
// ---------------------------------------------------------------------------

export const ProjectSignalTypeSchema = z.enum(PROJECT_SIGNAL_TYPES)
export const ProjectSignalStateEnum = z.enum(PROJECT_SIGNAL_STATES as unknown as [string, ...string[]])

// ---------------------------------------------------------------------------
// Preprocess helpers: convert empty strings from HTML selects to undefined
// ---------------------------------------------------------------------------

const emptyToUndefined = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional())

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

export const createProjectSignalSchema = z.object({
  signal_type: ProjectSignalTypeSchema,
  source_evidence: z
    .string()
    .min(1, 'Source evidence is required')
    .max(2000, 'Source evidence must be under 2000 characters'),
  linked_client_id: z.string().min(1, 'Client is required'),
  linked_contact_id: emptyToUndefined,
  project_identity: z
    .string()
    .min(1, 'Project identity is required')
    .max(500, 'Project identity must be under 500 characters'),
  timing_signal: z.string().max(500).nullable().optional(),
  fit_risk_note: z.string().max(2000).nullable().optional(),
  notes: z.string().max(5000).optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: emptyToUndefined,
})

export type CreateProjectSignalInput = z.infer<typeof createProjectSignalSchema>

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updateProjectSignalSchema = createProjectSignalSchema.partial().extend({
  id: z.string().min(1, 'Signal ID is required'),
})

export type UpdateProjectSignalInput = z.infer<typeof updateProjectSignalSchema>

// ---------------------------------------------------------------------------
// Transition Schema
// ---------------------------------------------------------------------------

export const projectSignalTransitionSchema = z.object({
  signal_id: z.string().min(1),
  target_state: ProjectSignalStateEnum,
  reason: z.string().max(2000).optional(),
  approval_granted: z.boolean().optional(),
})

export type ProjectSignalTransitionInput = z.infer<typeof projectSignalTransitionSchema>
