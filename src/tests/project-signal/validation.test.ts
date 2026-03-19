import { describe, it, expect } from 'vitest'
import {
  createProjectSignalSchema,
  updateProjectSignalSchema,
  projectSignalTransitionSchema,
} from '@/lib/validations/project-signal'

describe('Project Signal Validation — Create Schema', () => {
  it('accepts valid minimal input', () => {
    const result = createProjectSignalSchema.safeParse({
      signal_type: 'referral',
      source_evidence: 'Contact referral from Megan Torres',
      linked_client_id: 'c1',
      project_identity: 'Crunch Fitness Lewisville',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid full input', () => {
    const result = createProjectSignalSchema.safeParse({
      signal_type: 'direct_contact',
      source_evidence: 'David Park reached out directly',
      linked_client_id: 'c1',
      linked_contact_id: 'con-1',
      project_identity: 'Data Center Garland Phase 2',
      timing_signal: 'Q4 2026 target',
      fit_risk_note: 'Cleanroom required',
      notes: 'High priority',
      next_action: 'Schedule walk',
      next_action_date: '2026-04-01',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing signal_type', () => {
    const result = createProjectSignalSchema.safeParse({
      source_evidence: 'Some evidence',
      linked_client_id: 'c1',
      project_identity: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing source_evidence', () => {
    const result = createProjectSignalSchema.safeParse({
      signal_type: 'referral',
      linked_client_id: 'c1',
      project_identity: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty source_evidence', () => {
    const result = createProjectSignalSchema.safeParse({
      signal_type: 'referral',
      source_evidence: '',
      linked_client_id: 'c1',
      project_identity: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing linked_client_id', () => {
    const result = createProjectSignalSchema.safeParse({
      signal_type: 'referral',
      source_evidence: 'Evidence',
      project_identity: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing project_identity', () => {
    const result = createProjectSignalSchema.safeParse({
      signal_type: 'referral',
      source_evidence: 'Evidence',
      linked_client_id: 'c1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid signal_type', () => {
    const result = createProjectSignalSchema.safeParse({
      signal_type: 'invalid_type',
      source_evidence: 'Evidence',
      linked_client_id: 'c1',
      project_identity: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid signal types', () => {
    const types = [
      'plan_room', 'direct_contact', 'referral', 'event_network',
      'repeat_client', 'subcontractor_tip', 'online_inquiry',
    ]
    for (const t of types) {
      const result = createProjectSignalSchema.safeParse({
        signal_type: t,
        source_evidence: 'Evidence',
        linked_client_id: 'c1',
        project_identity: 'Test',
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('Project Signal Validation — Update Schema', () => {
  it('requires id', () => {
    const result = updateProjectSignalSchema.safeParse({ project_identity: 'Updated' })
    expect(result.success).toBe(false)
  })

  it('accepts id with partial fields', () => {
    const result = updateProjectSignalSchema.safeParse({ id: 'abc', fit_risk_note: 'Updated note' })
    expect(result.success).toBe(true)
  })
})

describe('Project Signal Validation — Transition Schema', () => {
  it('accepts valid transition input', () => {
    const result = projectSignalTransitionSchema.safeParse({
      signal_id: 'abc',
      target_state: 'under_review',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid target_state', () => {
    const result = projectSignalTransitionSchema.safeParse({
      signal_id: 'abc',
      target_state: 'invalid_state',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid project signal states', () => {
    const states = ['received', 'under_review', 'passed', 'failed', 'deferred']
    for (const s of states) {
      const result = projectSignalTransitionSchema.safeParse({
        signal_id: 'abc',
        target_state: s,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects missing signal_id', () => {
    const result = projectSignalTransitionSchema.safeParse({
      target_state: 'under_review',
    })
    expect(result.success).toBe(false)
  })
})
