import { z } from 'zod/v4'

// ---------------------------------------------------------------------------
// Preprocess helpers: convert empty strings from HTML selects to undefined
// ---------------------------------------------------------------------------

const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), z.enum(values).optional())

export const createSiteWalkSchema = z.object({
  pursuit_id: z.string().min(1, 'Pursuit ID is required'),
  walk_date: z.string().min(1, 'Walk date is required'),
  walk_time: z.string().min(1, 'Walk time is required'),
  location: z.string().min(1, 'Location is required').max(500),
  attendees: z.string().min(1, 'Attendees are required').max(2000),
  notes: z.string().max(5000).nullable().optional(),
})

export type CreateSiteWalkInput = z.infer<typeof createSiteWalkSchema>

export const updateSiteWalkSchema = createSiteWalkSchema.partial().extend({
  id: z.string().min(1, 'Site Walk ID is required'),
  status: optionalEnum(['scheduled', 'completed', 'cancelled'] as [string, ...string[]]),
})

export type UpdateSiteWalkInput = z.infer<typeof updateSiteWalkSchema>
