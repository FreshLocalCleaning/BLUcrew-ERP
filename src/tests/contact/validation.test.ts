import { describe, it, expect } from 'vitest'
import { createContactSchema, updateContactSchema } from '@/lib/validations/contact'

describe('Contact Validation — Create Schema', () => {
  const validInput = {
    first_name: 'John',
    last_name: 'Doe',
    client_id: 'client-123',
    layer: 'pm_super_field',
    influence: 'medium',
    relationship_strength: 'new',
  }

  it('accepts valid minimal input', () => {
    expect(createContactSchema.safeParse(validInput).success).toBe(true)
  })

  it('accepts full input', () => {
    const result = createContactSchema.safeParse({
      ...validInput,
      title: 'Senior PM',
      company: 'Acme Corp',
      role_type: 'PM',
      is_champion: true,
      champion_reason: 'Advocates internally',
      email: 'john@acme.com',
      phone: '214-555-0100',
      linkedin_url: 'https://linkedin.com/in/johndoe',
      preferred_channel: 'email',
      source_channel: 'trailer_visit',
      project_visibility_notes: 'Has visibility into new hospital',
      access_path: 'Via Marcus at AGC event',
      pain_points: 'Needs faster turnaround',
      notes: 'Good contact',
      next_step: 'Schedule lunch',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing first_name', () => {
    const { first_name: _, ...rest } = validInput
    void _
    expect(createContactSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing last_name', () => {
    const { last_name: _, ...rest } = validInput
    void _
    expect(createContactSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing client_id', () => {
    const { client_id: _, ...rest } = validInput
    void _
    expect(createContactSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects empty first_name', () => {
    expect(createContactSchema.safeParse({ ...validInput, first_name: '' }).success).toBe(false)
  })

  it('rejects empty client_id', () => {
    expect(createContactSchema.safeParse({ ...validInput, client_id: '' }).success).toBe(false)
  })

  it('rejects invalid layer', () => {
    expect(createContactSchema.safeParse({ ...validInput, layer: 'invalid' }).success).toBe(false)
  })

  it('rejects invalid influence', () => {
    expect(createContactSchema.safeParse({ ...validInput, influence: 'extreme' }).success).toBe(false)
  })

  it('rejects invalid relationship_strength', () => {
    expect(createContactSchema.safeParse({ ...validInput, relationship_strength: 'invalid' }).success).toBe(false)
  })

  it('rejects invalid source_channel', () => {
    expect(createContactSchema.safeParse({ ...validInput, source_channel: 'telepathy' }).success).toBe(false)
  })

  it('rejects invalid preferred_channel', () => {
    expect(createContactSchema.safeParse({ ...validInput, preferred_channel: 'fax' }).success).toBe(false)
  })

  it('accepts all valid layers', () => {
    const layers = ['pm_super_field', 'estimator_precon', 'exec_owner_rep', 'coordinator_admin', 'blu_champion']
    for (const layer of layers) {
      expect(createContactSchema.safeParse({ ...validInput, layer }).success).toBe(true)
    }
  })

  it('accepts all valid influence levels', () => {
    for (const influence of ['high', 'medium', 'low']) {
      expect(createContactSchema.safeParse({ ...validInput, influence }).success).toBe(true)
    }
  })

  it('accepts all valid relationship strengths', () => {
    for (const rs of ['new', 'developing', 'active', 'trusted', 'dormant']) {
      expect(createContactSchema.safeParse({ ...validInput, relationship_strength: rs }).success).toBe(true)
    }
  })

  it('accepts all valid source channels', () => {
    const channels = [
      'trailer_visit', 'cold_outreach', 'event', 'luncheon',
      'referral', 'repeat_client', 'inbound', 'project_handoff',
    ]
    for (const sc of channels) {
      expect(createContactSchema.safeParse({ ...validInput, source_channel: sc }).success).toBe(true)
    }
  })

  it('accepts all valid preferred channels', () => {
    for (const pc of ['email', 'phone', 'text', 'linkedin', 'in_person']) {
      expect(createContactSchema.safeParse({ ...validInput, preferred_channel: pc }).success).toBe(true)
    }
  })

  it('defaults is_champion to false', () => {
    const result = createContactSchema.safeParse(validInput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_champion).toBe(false)
    }
  })
})

describe('Contact Validation — Update Schema', () => {
  it('requires id', () => {
    expect(updateContactSchema.safeParse({ first_name: 'X' }).success).toBe(false)
  })

  it('accepts id with partial fields', () => {
    expect(updateContactSchema.safeParse({ id: 'abc', influence: 'high' }).success).toBe(true)
  })

  it('accepts touch_count update', () => {
    expect(updateContactSchema.safeParse({ id: 'abc', touch_count: 10 }).success).toBe(true)
  })

  it('rejects negative touch_count', () => {
    expect(updateContactSchema.safeParse({ id: 'abc', touch_count: -1 }).success).toBe(false)
  })
})
