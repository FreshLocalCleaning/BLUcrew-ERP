import { z } from 'zod/v4'
import { ESTIMATE_STATUSES } from '@/lib/state-machines/estimate'

// ---------------------------------------------------------------------------
// Enum Zod types
// ---------------------------------------------------------------------------

export const EstimateStatusEnum = z.enum(ESTIMATE_STATUSES as unknown as [string, ...string[]])

// ---------------------------------------------------------------------------
// Surcharge schema
// ---------------------------------------------------------------------------

export const estimateSurchargeSchema = z.object({
  name: z.string(),
  amount: z.number(),
  type: z.enum(['flat', 'percentage']),
})

// ---------------------------------------------------------------------------
// Mobilization cost schema
// ---------------------------------------------------------------------------

export const estimateMobilizationCostSchema = z.object({
  distance_miles: z.number().nullable(),
  trips: z.number().nullable(),
  base_cost: z.number().nullable(),
  total: z.number().nullable(),
})

// ---------------------------------------------------------------------------
// Stage pricing schema
// ---------------------------------------------------------------------------

export const estimateStagePricingSchema = z.object({
  stage_name: z.string(),
  weight: z.number(),
  subtotal: z.number(),
})

// ---------------------------------------------------------------------------
// Pricing summary schema
// ---------------------------------------------------------------------------

export const estimatePricingSummarySchema = z.object({
  stage_breakdowns: z.array(estimateStagePricingSchema),
  subtotal: z.number(),
  adjustments: z.number(),
  grand_total: z.number(),
})

// ---------------------------------------------------------------------------
// Preprocess helpers: convert empty strings from HTML inputs to undefined
// ---------------------------------------------------------------------------

const emptyToUndefined = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional())

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

export const createEstimateSchema = z.object({
  linked_pursuit_id: z.string().min(1, 'A Pursuit at estimate_ready status is required'),
  linked_client_id: z.string().min(1, 'Client ID is required'),
  linked_client_name: z.string().min(1, 'Client name is required'),
  linked_pursuit_name: z.string().min(1, 'Pursuit name is required'),
  project_name: z
    .string()
    .min(1, 'Project name is required')
    .max(300, 'Project name must be under 300 characters'),
  build_type: z.string().nullable().optional(),
  square_footage: z.number().positive().nullable().optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: emptyToUndefined,
  notes: z.string().max(5000).optional(),
})

export type CreateEstimateInput = z.infer<typeof createEstimateSchema>

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updateEstimateSchema = z.object({
  id: z.string().min(1, 'Estimate ID is required'),
  project_name: z.string().min(1).max(300).optional(),
  build_type: z.string().nullable().optional(),
  square_footage: z.number().positive().nullable().optional(),
  stage_count: z.number().int().min(1).max(4).nullable().optional(),
  stage_selections: z.array(z.string()).optional(),
  tier_index: z.number().int().min(0).max(5).nullable().optional(),
  base_rate: z.number().nullable().optional(),
  blu3_rate: z.number().nullable().optional(),
  surcharges: z.array(estimateSurchargeSchema).optional(),
  mobilization_cost: estimateMobilizationCostSchema.nullable().optional(),
  exterior_cost: z.number().nullable().optional(),
  window_cost: z.number().nullable().optional(),
  per_diem_cost: z.number().nullable().optional(),
  labor_target_hours: z.number().nullable().optional(),
  assumptions: z.string().max(10000).nullable().optional(),
  exclusions: z.string().max(10000).nullable().optional(),
  scope_text: z.string().max(50000).nullable().optional(),
  pricing_summary: estimatePricingSummarySchema.nullable().optional(),
  qa_reviewer_id: z.string().nullable().optional(),
  qa_reviewer_name: z.string().nullable().optional(),
  qa_notes: z.string().max(5000).nullable().optional(),
  estimator_snapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: emptyToUndefined,
})

export type UpdateEstimateInput = z.infer<typeof updateEstimateSchema>

// ---------------------------------------------------------------------------
// Save Estimator State Schema
// ---------------------------------------------------------------------------

export const saveEstimatorStateSchema = z.object({
  id: z.string().min(1, 'Estimate ID is required'),
  estimator_snapshot: z.record(z.string(), z.unknown()),
  build_type: z.string().nullable().optional(),
  square_footage: z.number().positive().nullable().optional(),
  stage_count: z.number().int().min(1).max(4).nullable().optional(),
  stage_selections: z.array(z.string()).optional(),
  tier_index: z.number().int().min(0).max(5).nullable().optional(),
  base_rate: z.number().nullable().optional(),
  blu3_rate: z.number().nullable().optional(),
  surcharges: z.array(estimateSurchargeSchema).optional(),
  mobilization_cost: estimateMobilizationCostSchema.nullable().optional(),
  exterior_cost: z.number().nullable().optional(),
  window_cost: z.number().nullable().optional(),
  per_diem_cost: z.number().nullable().optional(),
  labor_target_hours: z.number().nullable().optional(),
  assumptions: z.string().max(10000).nullable().optional(),
  exclusions: z.string().max(10000).nullable().optional(),
  scope_text: z.string().max(50000).nullable().optional(),
  pricing_summary: estimatePricingSummarySchema.nullable().optional(),
})

export type SaveEstimatorStateInput = z.infer<typeof saveEstimatorStateSchema>

// ---------------------------------------------------------------------------
// Transition Schema
// ---------------------------------------------------------------------------

export const estimateTransitionSchema = z.object({
  estimate_id: z.string().min(1),
  target_status: EstimateStatusEnum,
  reason: z.string().max(2000).optional(),
  approval_granted: z.boolean().optional(),
})

export type EstimateTransitionInput = z.infer<typeof estimateTransitionSchema>
