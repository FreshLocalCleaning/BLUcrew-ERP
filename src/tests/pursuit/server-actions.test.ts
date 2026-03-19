import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import { createClient } from '@/lib/db/clients'
import { createContact } from '@/lib/db/contacts'
import { createProjectSignal, updateProjectSignal } from '@/lib/db/project-signals'
import { createPursuit } from '@/lib/db/pursuits'
import {
  createPursuitAction,
  updatePursuitAction,
  transitionPursuitAction,
  getPursuitAction,
  listPursuitsAction,
} from '@/actions/pursuit'

let clientId: string
let contactId: string
let passedSignalId: string

beforeEach(() => {
  resetDb()
  const client = createClient({ name: 'Test Client' }, 'actor-1')
  clientId = client.id
  const contact = createContact(
    {
      first_name: 'John',
      last_name: 'Doe',
      client_id: clientId,
      client_name: 'Test Client',
      layer: 'pm_super_field' as const,
      influence: 'medium' as const,
      is_champion: false,
      relationship_strength: 'new' as const,
      owner: 'actor-1',
    },
    'actor-1',
  )
  contactId = contact.id

  // Create a passed signal for use in tests
  const signal = createProjectSignal(
    {
      signal_type: 'referral',
      source_evidence: 'Test referral',
      linked_client_id: clientId,
      linked_client_name: 'Test Client',
      linked_contact_id: contactId,
      linked_contact_name: 'John Doe',
      project_identity: 'Test Project',
      timing_signal: null,
      fit_risk_note: null,
      owner: 'actor-1',
    },
    'actor-1',
  )
  // Move signal to passed state
  updateProjectSignal(signal.id, {
    status: 'passed',
    gate_outcome: 'passed',
    gate_decision_by: 'actor-1',
    gate_decision_date: new Date().toISOString(),
  }, 'actor-1', 'Signal passed')
  passedSignalId = signal.id
})

// ---------------------------------------------------------------------------
// Create — signal gate enforcement (DELTA-9)
// ---------------------------------------------------------------------------

describe('Pursuit Server Actions — Create (Signal Gate)', () => {
  it('creates a pursuit with a passed signal', async () => {
    const result = await createPursuitAction({
      linked_signal_id: passedSignalId,
      project_name: 'Test Project',
      client_id: clientId,
      client_name: 'Test Client',
    })
    expect(result.success).toBe(true)
    expect(result.data?.project_name).toBe('Test Project')
    expect(result.data?.stage).toBe('project_signal_received')
    expect(result.data?.reference_id).toBe('PUR-0001')
    expect(result.data?.linked_signal_id).toBe(passedSignalId)
  })

  it('rejects creation without a linked signal ID', async () => {
    const result = await createPursuitAction({
      project_name: 'Test Project',
      client_id: clientId,
      client_name: 'Test Client',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects creation with empty linked signal ID', async () => {
    const result = await createPursuitAction({
      linked_signal_id: '',
      project_name: 'Test Project',
      client_id: clientId,
      client_name: 'Test Client',
    })
    expect(result.success).toBe(false)
  })

  it('rejects creation when signal does not exist', async () => {
    const result = await createPursuitAction({
      linked_signal_id: 'non-existent-signal',
      project_name: 'Test Project',
      client_id: clientId,
      client_name: 'Test Client',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('rejects creation when signal gate has not passed (pending)', async () => {
    const pendingSignal = createProjectSignal(
      {
        signal_type: 'direct_contact',
        source_evidence: 'Direct contact',
        linked_client_id: clientId,
        linked_client_name: 'Test Client',
        project_identity: 'Pending Project',
        timing_signal: null,
        fit_risk_note: null,
        owner: 'actor-1',
      },
      'actor-1',
    )
    const result = await createPursuitAction({
      linked_signal_id: pendingSignal.id,
      project_name: 'Test Project',
      client_id: clientId,
      client_name: 'Test Client',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('gate has not passed')
  })

  it('rejects creation when signal gate failed', async () => {
    const failedSignal = createProjectSignal(
      {
        signal_type: 'plan_room',
        source_evidence: 'Plan room listing',
        linked_client_id: clientId,
        linked_client_name: 'Test Client',
        project_identity: 'Failed Project',
        timing_signal: null,
        fit_risk_note: null,
        owner: 'actor-1',
      },
      'actor-1',
    )
    updateProjectSignal(failedSignal.id, {
      status: 'failed',
      gate_outcome: 'failed',
      gate_decision_by: 'actor-1',
      gate_decision_date: new Date().toISOString(),
    }, 'actor-1', 'Not a real opportunity')

    const result = await createPursuitAction({
      linked_signal_id: failedSignal.id,
      project_name: 'Test Project',
      client_id: clientId,
      client_name: 'Test Client',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('gate has not passed')
  })

  it('rejects creation when signal was already used for another pursuit', async () => {
    // First pursuit succeeds
    const first = await createPursuitAction({
      linked_signal_id: passedSignalId,
      project_name: 'First Pursuit',
      client_id: clientId,
      client_name: 'Test Client',
    })
    expect(first.success).toBe(true)

    // Second pursuit from same signal fails
    const second = await createPursuitAction({
      linked_signal_id: passedSignalId,
      project_name: 'Second Pursuit',
      client_id: clientId,
      client_name: 'Test Client',
    })
    expect(second.success).toBe(false)
    expect(second.error).toContain('already been used')
  })

  it('links pursuit back to signal (sets created_pursuit_id)', async () => {
    const result = await createPursuitAction({
      linked_signal_id: passedSignalId,
      project_name: 'Linked Pursuit',
      client_id: clientId,
      client_name: 'Test Client',
    })
    expect(result.success).toBe(true)

    // Import the signal DB to check back-link
    const { getProjectSignal } = await import('@/lib/db/project-signals')
    const signal = getProjectSignal(passedSignalId)
    expect(signal?.created_pursuit_id).toBe(result.data?.id)
  })

  it('returns error for missing project name', async () => {
    const result = await createPursuitAction({
      linked_signal_id: passedSignalId,
      client_id: clientId,
      client_name: 'Test Client',
    })
    expect(result.success).toBe(false)
  })

  it('returns error for missing client_id', async () => {
    const result = await createPursuitAction({
      linked_signal_id: passedSignalId,
      project_name: 'Test',
      client_name: 'C',
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

describe('Pursuit Server Actions — Update', () => {
  it('updates a pursuit', async () => {
    const pursuit = createPursuit(
      { linked_signal_id: passedSignalId, project_name: 'Original', client_id: clientId, client_name: 'Test Client' },
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

// ---------------------------------------------------------------------------
// Transition
// ---------------------------------------------------------------------------

describe('Pursuit Server Actions — Transition', () => {
  it('transitions from signal to qualification', async () => {
    const pursuit = createPursuit(
      { linked_signal_id: passedSignalId, project_name: 'Test', client_id: clientId, client_name: 'Test Client' },
      'actor-1',
    )
    const result = await transitionPursuitAction({
      pursuit_id: pursuit.id,
      target_stage: 'qualification_underway',
    })
    expect(result.success).toBe(true)
    expect(result.data?.stage).toBe('qualification_underway')
  })

  it('transitions to no_bid with reason (from qualification_underway)', async () => {
    const pursuit = createPursuit(
      { linked_signal_id: passedSignalId, project_name: 'Test', client_id: clientId, client_name: 'Test Client' },
      'actor-1',
    )
    await transitionPursuitAction({ pursuit_id: pursuit.id, target_stage: 'qualification_underway' })
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
      { linked_signal_id: passedSignalId, project_name: 'Test', client_id: clientId, client_name: 'Test Client', stage: 'qualification_underway' },
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
      { linked_signal_id: passedSignalId, project_name: 'Test', client_id: clientId, client_name: 'Test Client' },
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

// ---------------------------------------------------------------------------
// Get & List
// ---------------------------------------------------------------------------

describe('Pursuit Server Actions — Get & List', () => {
  it('gets a pursuit by ID', async () => {
    const pursuit = createPursuit(
      { linked_signal_id: passedSignalId, project_name: 'Get Me', client_id: clientId, client_name: 'Test Client' },
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
    createPursuit({ linked_signal_id: passedSignalId, project_name: 'A', client_id: clientId, client_name: 'Test Client' }, 'actor-1')
    const result = await listPursuitsAction()
    expect(result.success).toBe(true)
    expect(result.data?.length).toBe(1)
  })
})
