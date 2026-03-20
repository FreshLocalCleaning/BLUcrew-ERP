import { z } from 'zod/v4'

// ---------------------------------------------------------------------------
// Preprocess helpers: convert empty strings from HTML selects to undefined
// ---------------------------------------------------------------------------

const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), z.enum(values).optional())

export const createCloseoutPlanSchema = z.object({
  pursuit_id: z.string().min(1, 'Pursuit ID is required'),
  plan_name: z.string().min(1, 'Plan name is required').max(300),
  description: z.string().min(1, 'Description is required').max(5000),
  scope_summary: z.string().min(1, 'Scope summary is required').max(5000),
})

export type CreateCloseoutPlanInput = z.infer<typeof createCloseoutPlanSchema>

export const updateCloseoutPlanSchema = createCloseoutPlanSchema.partial().extend({
  id: z.string().min(1, 'Closeout Plan ID is required'),
  status: optionalEnum(['draft', 'submitted', 'approved', 'returned'] as [string, ...string[]]),
})

export type UpdateCloseoutPlanInput = z.infer<typeof updateCloseoutPlanSchema>
