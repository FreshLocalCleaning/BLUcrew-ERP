import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import { createPursuit } from '@/lib/db/pursuits'
import {
  createPursuitAction,
  updatePursuitAction,
  transitionPursuitAction,
  getPursuitAction,
  listPursuitsAction,
} from '@/actions/pursuit'

beforeEach(() => {
  resetDb()
})

describe('Pursuit Server Actions — Create', () => {
  it('creates a pursuit with valid data', async () => {
    const result = await createPursuitAction({
      project_name: 'Test Project',
      client_id: 'c1',
      client_name: 'Client One',
    })
    expect(result.success).toBe(true)
    expect(result.data?.project_name).toBe('Test Project')
    expect(result.data?.stage).toBe('project_signal_received')
    expect(result.data?.reference_id).toBe('PUR-0001')
  })

  it('returns error for missing project name', async () => {
    const result = await createPursuitAction({
      client_id: 'c1',
      client_name: 'Client One',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('returns error for missing client_id', async () => {
    const result = await createPursuitAction({
      project_name: 'Test',
      client_name: 'C',
    })
    expect(result.success).toBe(false)
  })
})

describe('Pursuit Server Actions — Update', () => {
  it('updates a pursuit', async () => {
    const pursuit = createPursuit(
      { project_name: 'Original', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    const result = await updatePursuitAction({
      id: pursuit.id,
      project_name: 'Updated Name',
    })
    expect(result.success).toBe(true)
    expect(result.data?.project_name).toBe('Updated Name')
  })

  it('returns error for missing ID', async () => {
    const result = await updatePursuitAction({
      project_name: 'Updated',
    })
    expect(result.success).toBe(false)
  })
})

describe('Pursuit Server Actions — Transition', () => {
  it('transitions from signal to qualification', async () => {
    const pursuit = createPursuit(
      { project_name: 'Test', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    const result = await transitionPursuitAction({
      pursuit_id: pursuit.id,
      target_stage: 'qualification_underway',
    })
    expect(result.success).toBe(true)
    expect(result.data?.stage).toBe('qualification_underway')
  })

  it('transitions to no_bid with reason', async () => {
    const pursuit = createPursuit(
      { project_name: 'Test', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    const result = await transitionPursuitAction({
      pursuit_id: pursuit.id,
      target_stage: 'no_bid',
      reason: 'Too far from service area',
    })
    expect(result.success).toBe(true)
    expect(result.data?.stage).toBe('no_bid')
    expect(result.data?.no_bid_reason).toBe('Too far from service area')
  })

  it('rejects no_bid without reason', async () => {
    const pursuit = createPursuit(
      { project_name: 'Test', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    const result = await transitionPursuitAction({
      pursuit_id: pursuit.id,
      target_stage: 'no_bid',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('reason')
  })

  it('rejects invalid stage jump', async () => {
    const pursuit = createPursuit(
      { project_name: 'Test', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    const result = await transitionPursuitAction({
      pursuit_id: pursuit.id,
      target_stage: 'estimate_ready',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('No transition defined')
  })

  it('returns error for non-existent pursuit', async () => {
    const result = await transitionPursuitAction({
      pursuit_id: 'non-existent',
      target_stage: 'qualification_underway',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})

describe('Pursuit Server Actions — Get & List', () => {
  it('gets a pursuit by ID', async () => {
    const pursuit = createPursuit(
      { project_name: 'Get Me', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    const result = await getPursuitAction(pursuit.id)
    expect(result.success).toBe(true)
    expect(result.data?.project_name).toBe('Get Me')
  })

  it('returns error for non-existent ID', async () => {
    const result = await getPursuitAction('non-existent')
    expect(result.success).toBe(false)
  })

  it('lists all pursuits', async () => {
    createPursuit({ project_name: 'A', client_id: 'c1', client_name: 'C1' }, 'actor-1')
    createPursuit({ project_name: 'B', client_id: 'c1', client_name: 'C1' }, 'actor-1')
    const result = await listPursuitsAction()
    expect(result.success).toBe(true)
    expect(result.data?.length).toBe(2)
  })
})
