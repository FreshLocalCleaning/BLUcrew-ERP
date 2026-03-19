import { z } from 'zod/v4'
import { CHANGE_ORDER_STATES } from '@/lib/state-machines/change-order'
import { CHANGE_ORDER_ORIGINS } from '@/types/commercial'

// ---------------------------------------------------------------------------
// Enum Zod types
// ---------------------------------------------------------------------------

export const ChangeOrderStateEnum = z.enum(CHANGE_ORDER_STATES as unknown as [string, ...string[]])
export const ChangeOrderOriginEnum = z.enum(CHANGE_ORDER_ORIGINS as unknown as [string, ...string[]])

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const pricingDeltaSchema = z.object({
  original_value: z.number(),
  revised_value: z.number(),
  delta: z.number(),
})

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

export const createChangeOrderSchema = z.object({
  linked_project_id: z.string().min(1, 'Project ID is required'),
  linked_mobilization_id: z.string().nullable().default(null),
  linked_client_id: z.string().min(1, 'Client ID is required'),
  origin: ChangeOrderOriginEnum,
  scope_delta: z.string().min(1, 'Scope delta description is required').max(5000),
  pricing_delta: pricingDeltaSchema.nullable().default(null),
  schedule_delta: z.string().nullable().default(null),
  mobilization_impact: z.string().nullable().default(null),
  fact_packet_by: z.string().min(1, 'Fact packet author is required'),
  priced_by: z.string().nullable().default(null),
  approval_notes: z.string().nullable().default(null),
  release_notes: z.string().nullable().default(null),
  client_response_date: z.string().nullable().default(null),
  rejection_reason: z.string().nullable().default(null),
})

export type CreateChangeOrderInput = z.infer<typeof createChangeOrderSchema>

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updateChangeOrderSchema = z.object({
  id: z.string().min(1, 'Change Order ID is required'),
  scope_delta: z.string().min(1).max(5000).optional(),
  pricing_delta: pricingDeltaSchema.nullable().optional(),
  schedule_delta: z.string().nullable().optional(),
  mobilization_impact: z.string().nullable().optional(),
  fact_packet_by: z.string().optional(),
  priced_by: z.string().nullable().optional(),
  approval_notes: z.string().nullable().optional(),
  release_notes: z.string().nullable().optional(),
  client_response_date: z.string().nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: z.string().optional(),
})

export type UpdateChangeOrderInput = z.infer<typeof updateChangeOrderSchema>

// ---------------------------------------------------------------------------
// Transition Schema
// ---------------------------------------------------------------------------

export const changeOrderTransitionSchema = z.object({
  change_order_id: z.string().min(1),
  target_status: ChangeOrderStateEnum,
  reason: z.string().max(2000).optional(),
  approval_granted: z.boolean().optional(),
})

export type ChangeOrderTransitionInput = z.infer<typeof changeOrderTransitionSchema>
