import { z } from 'zod/v4'
import { CLIENT_STATES } from '@/lib/state-machines/client'

// ---------------------------------------------------------------------------
// Enums (from ERP-02 Key Enum Anchors)
// ---------------------------------------------------------------------------

export const ClientTier = z.enum(['enterprise', 'mid_market', 'smb'])
export type ClientTier = z.infer<typeof ClientTier>

export const ClientVertical = z.enum([
  'healthcare',
  'education',
  'government',
  'commercial_office',
  'retail',
  'hospitality',
  'industrial',
  'mixed_use',
  'residential_hoa',
  'other',
])
export type ClientVertical = z.infer<typeof ClientVertical>

export const ClientSource = z.enum([
  'ghl_inbound',
  'referral',
  'cold_outreach',
  'repeat',
  'rfi_response',
  'event',
  'other',
])
export type ClientSource = z.infer<typeof ClientSource>

export const ClientStateEnum = z.enum(CLIENT_STATES as unknown as [string, ...string[]])

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

export const createClientSchema = z.object({
  name: z
    .string()
    .min(1, 'Client name is required')
    .max(200, 'Client name must be under 200 characters'),
  dba: z.string().max(200).optional(),
  tier: ClientTier.optional(),
  vertical: ClientVertical.optional(),
  source: ClientSource.optional(),
  website: z.url('Invalid URL').optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  email: z.email('Invalid email').optional().or(z.literal('')),
  address_line_1: z.string().max(300).optional(),
  address_line_2: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  notes: z.string().max(5000).optional(),
  ghl_company_id: z.string().optional(),
  bd_owner_id: z.string().optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updateClientSchema = createClientSchema.partial().extend({
  id: z.string().min(1, 'Client ID is required'),
  next_action: z.string().max(500).optional(),
  won_award_id: z.string().optional(),
})

export type UpdateClientInput = z.infer<typeof updateClientSchema>

// ---------------------------------------------------------------------------
// Transition Schema
// ---------------------------------------------------------------------------

export const clientTransitionSchema = z.object({
  client_id: z.string().min(1),
  target_state: ClientStateEnum,
  reason: z.string().max(2000).optional(),
  approval_granted: z.boolean().optional(),
})

export type ClientTransitionInput = z.infer<typeof clientTransitionSchema>
