import { describe, it, expect } from 'vitest'
import { createPursuitSchema, updatePursuitSchema, pursuitTransitionSchema } from '@/lib/validations/pursuit'

describe('Pursuit Validation — Create Schema', () => {
  it('accepts valid minimal input', () => {
    const result = createPursuitSchema.safeParse({
      linked_signal_id: 'sig-1',
      project_name: 'Test Project',
      client_id: 'abc-123',
      client_name: 'Test Client',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing linked_signal_id', () => {
    const result = createPursuitSchema.safeParse({
      project_name: 'Test Project',
      client_id: 'abc-123',
      client_name: 'Test Client',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid full input', () => {
    const result = createPursuitSchema.safeParse({
      linked_signal_id: 'sig-1',
      project_name: 'Crunch Fitness',
      client_id: 'abc-123',
      client_name: 'Summit Peak',
      primary_contact_id: 'con-1',
      primary_contact_name: 'Megan Torres',
      signal_type: 'referral',
      client_type: 'gc',
      build_type: 'gym_fitness',
      location: 'Lewisville, TX',
      approx_sqft: 32500,
      projected_substantial_completion: '2026-06-01',
      target_owner_walk: '2026-05-15',
      target_opening: '2026-07-01',
      next_action: 'Send estimate',
      next_action_date: '2026-03-25',
      notes: 'Some notes',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing project_name', () => {
    const result = createPursuitSchema.safeParse({
      client_id: 'abc-123',
      client_name: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing client_id', () => {
    const result = createPursuitSchema.safeParse({
      project_name: 'Test',
      client_name: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty project_name', () => {
    const result = createPursuitSchema.safeParse({
      project_name: '',
      client_id: 'abc-123',
      client_name: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid signal_type', () => {
    const result = createPursuitSchema.safeParse({
      project_name: 'Test',
      client_id: 'abc-123',
      client_name: 'Test',
      signal_type: 'invalid_type',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid client_type', () => {
    const result = createPursuitSchema.safeParse({
      project_name: 'Test',
      client_id: 'abc-123',
      client_name: 'Test',
      client_type: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid build_type', () => {
    const result = createPursuitSchema.safeParse({
      project_name: 'Test',
      client_id: 'abc-123',
      client_name: 'Test',
      build_type: 'spaceship',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative approx_sqft', () => {
    const result = createPursuitSchema.safeParse({
      project_name: 'Test',
      client_id: 'abc-123',
      client_name: 'Test',
      approx_sqft: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero approx_sqft', () => {
    const result = createPursuitSchema.safeParse({
      project_name: 'Test',
      client_id: 'abc-123',
      client_name: 'Test',
      approx_sqft: 0,
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid signal types', () => {
    const types = ['referral', 'trailer', 'outreach', 'event', 'repeat_client', 'inbound']
    for (const t of types) {
      const result = createPursuitSchema.safeParse({
        linked_signal_id: 'sig-1',
        project_name: 'Test',
        client_id: 'abc',
        client_name: 'C',
        signal_type: t,
      })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all valid build types', () => {
    const types = [
      'gym_fitness', 'data_center', 'hospitality', 'medical', 'retail',
      'office', 'restaurant', 'industrial', 'education', 'multifamily', 'other',
    ]
    for (const t of types) {
      const result = createPursuitSchema.safeParse({
        linked_signal_id: 'sig-1',
        project_name: 'Test',
        client_id: 'abc',
        client_name: 'C',
        build_type: t,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('Pursuit Validation — Update Schema', () => {
  it('requires ID', () => {
    const result = updatePursuitSchema.safeParse({
      project_name: 'Updated',
    })
    expect(result.success).toBe(false)
  })

  it('accepts partial updates with ID', () => {
    const result = updatePursuitSchema.safeParse({
      id: 'abc-123',
      project_name: 'Updated Name',
    })
    expect(result.success).toBe(true)
  })

  it('accepts no_bid_reason', () => {
    const result = updatePursuitSchema.safeParse({
      id: 'abc-123',
      no_bid_reason: 'Too far from service area',
    })
    expect(result.success).toBe(true)
  })
})

describe('Pursuit Validation — Transition Schema', () => {
  it('accepts valid transition', () => {
    const result = pursuitTransitionSchema.safeParse({
      pursuit_id: 'abc-123',
      target_stage: 'qualification_underway',
    })
    expect(result.success).toBe(true)
  })

  it('accepts transition with reason', () => {
    const result = pursuitTransitionSchema.safeParse({
      pursuit_id: 'abc-123',
      target_stage: 'no_bid',
      reason: 'Out of scope',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing pursuit_id', () => {
    const result = pursuitTransitionSchema.safeParse({
      target_stage: 'qualification_underway',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid target_stage', () => {
    const result = pursuitTransitionSchema.safeParse({
      pursuit_id: 'abc-123',
      target_stage: 'invalid_stage',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid pursuit stages (ERP-13: 12 stages)', () => {
    const stages = [
      'project_signal_received', 'qualification_underway', 'qualified_pursuit',
      'preconstruction_packet_open', 'site_walk_scheduled', 'site_walk_complete',
      'pursue_no_bid_review', 'blu_closeout_plan_sent', 'estimate_ready',
      'hold', 'dormant', 'no_bid',
    ]
    for (const s of stages) {
      const result = pursuitTransitionSchema.safeParse({
        pursuit_id: 'abc',
        target_stage: s,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects old removed stages', () => {
    for (const s of ['closeout_plan_drafted', 'closeout_plan_approved', 'scope_development', 'internal_review']) {
      const result = pursuitTransitionSchema.safeParse({
        pursuit_id: 'abc',
        target_stage: s,
      })
      expect(result.success).toBe(false)
    }
  })
})
