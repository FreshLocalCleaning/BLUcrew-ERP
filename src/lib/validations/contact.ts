import { z } from 'zod/v4'
import {
  CONTACT_LAYERS,
  CONTACT_INFLUENCE_LEVELS,
  CONTACT_RELATIONSHIP_STRENGTHS,
  CONTACT_SOURCE_CHANNELS,
  CONTACT_PREFERRED_CHANNELS,
} from '@/types/commercial'

// ---------------------------------------------------------------------------
// Enum schemas
// ---------------------------------------------------------------------------

export const ContactLayerSchema = z.enum(CONTACT_LAYERS)
export const ContactInfluenceSchema = z.enum(CONTACT_INFLUENCE_LEVELS)
export const ContactRelationshipSchema = z.enum(CONTACT_RELATIONSHIP_STRENGTHS)
export const ContactSourceSchema = z.enum(CONTACT_SOURCE_CHANNELS)
export const ContactPreferredChannelSchema = z.enum(CONTACT_PREFERRED_CHANNELS)

// ---------------------------------------------------------------------------
// Preprocess helpers: convert empty strings from HTML selects to undefined
// ---------------------------------------------------------------------------

const emptyToUndefined = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional())
const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), z.enum(values).optional())

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

export const createContactSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be under 100 characters'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be under 100 characters'),
  title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  client_id: z.string().min(1, 'Client is required'),
  layer: ContactLayerSchema,
  role_type: z.string().max(200).optional(),
  influence: ContactInfluenceSchema,
  is_champion: z.boolean().default(false),
  champion_reason: z.string().max(1000).optional(),
  email: z.union([z.email('Invalid email'), z.literal('')]).optional(),
  phone: z.string().max(30).optional(),
  linkedin_url: z.union([z.url('Invalid URL'), z.literal('')]).optional(),
  preferred_channel: optionalEnum(CONTACT_PREFERRED_CHANNELS as unknown as [string, ...string[]]),
  relationship_strength: ContactRelationshipSchema,
  source_channel: optionalEnum(CONTACT_SOURCE_CHANNELS as unknown as [string, ...string[]]),
  project_visibility_notes: z.string().max(2000).optional(),
  access_path: z.string().max(1000).optional(),
  pain_points: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  next_step: z.string().max(500).optional(),
  next_step_due_date: emptyToUndefined,
  owner_name: z.string().max(200).optional(),
})

export type CreateContactInput = z.infer<typeof createContactSchema>

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updateContactSchema = createContactSchema.partial().extend({
  id: z.string().min(1, 'Contact ID is required'),
  last_touch_date: emptyToUndefined,
  touch_count: z.number().int().min(0).optional(),
})

export type UpdateContactInput = z.infer<typeof updateContactSchema>
