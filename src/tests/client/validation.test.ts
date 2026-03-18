import { describe, it, expect } from 'vitest'
import {
  createClientSchema,
  updateClientSchema,
  clientTransitionSchema,
} from '@/lib/validations/client'

describe('Client Validation — Create Schema', () => {
  it('accepts valid minimal input', () => {
    const result = createClientSchema.safeParse({ name: 'Acme Corp' })
    expect(result.success).toBe(true)
  })

  it('accepts full input', () => {
    const result = createClientSchema.safeParse({
      name: 'Full Corp',
      tier: 'A',
      vertical: 'general_contractor',
      market: 'dallas_fort_worth',
      relationship_strength: 'active',
      next_action: 'Call them',
      next_action_date: '2026-04-01',
      notes: 'Good client',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createClientSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = createClientSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects name over 200 chars', () => {
    const result = createClientSchema.safeParse({ name: 'x'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid tier', () => {
    const result = createClientSchema.safeParse({ name: 'X', tier: 'Z' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid vertical', () => {
    const result = createClientSchema.safeParse({ name: 'X', vertical: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid market', () => {
    const result = createClientSchema.safeParse({ name: 'X', market: 'mars' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid relationship_strength', () => {
    const result = createClientSchema.safeParse({ name: 'X', relationship_strength: 'fiery' })
    expect(result.success).toBe(false)
  })

  it('accepts valid tier values A, B, C', () => {
    for (const tier of ['A', 'B', 'C']) {
      const result = createClientSchema.safeParse({ name: 'X', tier })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all valid markets', () => {
    const markets = [
      'dallas_fort_worth', 'north_texas', 'austin', 'houston',
      'san_antonio', 'other_texas', 'oklahoma', 'out_of_state',
    ]
    for (const market of markets) {
      const result = createClientSchema.safeParse({ name: 'X', market })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all valid verticals', () => {
    const verticals = [
      'general_contractor', 'owner_developer', 'gym_fitness', 'data_center',
      'hospitality', 'medical', 'retail', 'office', 'restaurant',
      'industrial', 'education', 'multifamily', 'other',
    ]
    for (const vertical of verticals) {
      const result = createClientSchema.safeParse({ name: 'X', vertical })
      expect(result.success).toBe(true)
    }
  })
})

describe('Client Validation — Update Schema', () => {
  it('requires id', () => {
    const result = updateClientSchema.safeParse({ name: 'X' })
    expect(result.success).toBe(false)
  })

  it('accepts id with partial fields', () => {
    const result = updateClientSchema.safeParse({ id: 'abc', tier: 'B' })
    expect(result.success).toBe(true)
  })
})

describe('Client Validation — Transition Schema', () => {
  it('requires client_id and target_state', () => {
    const result = clientTransitionSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts valid transition input', () => {
    const result = clientTransitionSchema.safeParse({
      client_id: 'abc',
      target_state: 'target_client',
      reason: 'Testing',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid target_state', () => {
    const result = clientTransitionSchema.safeParse({
      client_id: 'abc',
      target_state: 'invalid_state',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid client states as target', () => {
    const states = [
      'watchlist', 'target_client', 'developing_relationship',
      'active_customer', 'strategic_preferred', 'dormant', 'archived',
    ]
    for (const state of states) {
      const result = clientTransitionSchema.safeParse({
        client_id: 'abc',
        target_state: state,
      })
      expect(result.success).toBe(true)
    }
  })
})
