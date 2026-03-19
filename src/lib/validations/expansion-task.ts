import { z } from 'zod/v4'
import { EXPANSION_TASK_STATES } from '@/lib/state-machines/expansion-task'
import { EXPANSION_TASK_TYPES } from '@/types/commercial'

// ---------------------------------------------------------------------------
// Enum Zod types
// ---------------------------------------------------------------------------

export const ExpansionTaskStateEnum = z.enum(EXPANSION_TASK_STATES as unknown as [string, ...string[]])
export const ExpansionTaskTypeEnum = z.enum(EXPANSION_TASK_TYPES as unknown as [string, ...string[]])

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

export const createExpansionTaskSchema = z.object({
  linked_project_id: z.string().min(1, 'Project ID is required'),
  linked_client_id: z.string().min(1, 'Client ID is required'),
  task_type: ExpansionTaskTypeEnum,
  growth_objective: z.string().min(1, 'Growth objective is required').max(5000),
  due_date: z.string().min(1, 'Due date is required'),
  referral_status: z.string().nullable().default(null),
  testimonial_status: z.string().nullable().default(null),
  next_signal_created: z.boolean().default(false),
  next_signal_id: z.string().nullable().default(null),
  completion_outcome: z.string().nullable().default(null),
})

export type CreateExpansionTaskInput = z.infer<typeof createExpansionTaskSchema>

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updateExpansionTaskSchema = z.object({
  id: z.string().min(1, 'Expansion Task ID is required'),
  task_type: ExpansionTaskTypeEnum.optional(),
  growth_objective: z.string().min(1).max(5000).optional(),
  due_date: z.string().optional(),
  referral_status: z.string().nullable().optional(),
  testimonial_status: z.string().nullable().optional(),
  next_signal_created: z.boolean().optional(),
  next_signal_id: z.string().nullable().optional(),
  completion_outcome: z.string().nullable().optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: z.string().optional(),
})

export type UpdateExpansionTaskInput = z.infer<typeof updateExpansionTaskSchema>

// ---------------------------------------------------------------------------
// Transition Schema
// ---------------------------------------------------------------------------

export const expansionTaskTransitionSchema = z.object({
  expansion_task_id: z.string().min(1),
  target_status: ExpansionTaskStateEnum,
  reason: z.string().max(2000).optional(),
  approval_granted: z.boolean().optional(),
})

export type ExpansionTaskTransitionInput = z.infer<typeof expansionTaskTransitionSchema>
