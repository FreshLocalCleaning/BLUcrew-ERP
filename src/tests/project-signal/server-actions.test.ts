import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import { createClient } from '@/lib/db/clients'
import { createContact } from '@/lib/db/contacts'
import { createProjectSignal } from '@/lib/db/project-signals'
import {
  createProjectSignalAction,
  updateProjectSignalAction,
  transitionProjectSignalAction,
  getProjectSignalAction,
  listProjectSignalsAction,
} from '@/actions/project-signal'

let clientId: string
let contactId: string

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
})

describe('Project Signal Server Actions — Create', () => {
  it('creates a signal with valid data', async () => {
    const result = await createProjectSignalAction({
      signal_type: 'referral',
      source_evidence: 'Referral from contact',
      linked_client_id: clientId,
      project_identity: 'Test Project',
    })
    expect(result.success).toBe(true)
    expect(result.data?.project_identity).toBe('Test Project')
    expect(result.data?.status).toBe('received')
    expect(result.data?.reference_id).toBe('SIG-0001')
    expect(result.data?.linked_client_name).toBe('Test Client')
  })

  it('denormalizes contact name when provided', async () => {
    const result = await createProjectSignalAction({
      signal_type: 'referral',
      source_evidence: 'Referral from John',
      linked_client_id: clientId,
      linked_contact_id: contactId,
      project_identity: 'Test Project',
    })
    expect(result.success).toBe(true)
    expect(result.data?.linked_contact_name).toBe('John Doe')
  })

  it('returns error for missing project_identity', async () => {
    const result = await createProjectSignalAction({
      signal_type: 'referral',
      source_evidence: 'Evidence',
      linked_client_id: clientId,
    })
    expect(result.success).toBe(false)
  })

  it('returns error for non-existent client', async () => {
    const result = await createProjectSignalAction({
      signal_type: 'referral',
      source_evidence: 'Evidence',
      linked_client_id: 'non-existent',
      project_identity: 'Test',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Client not found')
  })
})

describe('Project Signal Server Actions — Update', () => {
  it('updates a signal', async () => {
    const signal = createProjectSignal(
      {
        signal_type: 'referral',
        source_evidence: 'Original evidence',
        linked_client_id: clientId,
        linked_client_name: 'Test Client',
        project_identity: 'Original',
        timing_signal: null,
        fit_risk_note: null,
        owner: 'actor-1',
      },
      'actor-1',
    )
    const result = await updateProjectSignalAction({
      id: signal.id,
      fit_risk_note: 'Low risk — good fit',
    })
    expect(result.success).toBe(true)
    expect(result.data?.fit_risk_note).toBe('Low risk — good fit')
  })

  it('returns error for missing ID', async () => {
    const result = await updateProjectSignalAction({ project_identity: 'Updated' })
    expect(result.success).toBe(false)
  })
})

describe('Project Signal Server Actions — Transition', () => {
  it('transitions received → under_review', async () => {
    const signal = createProjectSignal(
      {
        signal_type: 'referral',
        source_evidence: 'Evidence',
        linked_client_id: clientId,
        linked_client_name: 'Test Client',
        project_identity: 'Test',
        timing_signal: null,
        fit_risk_note: null,
        owner: 'actor-1',
      },
      'actor-1',
    )
    const result = await transitionProjectSignalAction({
      signal_id: signal.id,
      target_state: 'under_review',
    })
    expect(result.success).toBe(true)
    expect(result.data?.status).toBe('under_review')
  })

  it('transitions under_review → passed and sets gate fields', async () => {
    const signal = createProjectSignal(
      {
        signal_type: 'referral',
        source_evidence: 'Evidence',
        linked_client_id: clientId,
        linked_client_name: 'Test Client',
        linked_contact_id: contactId,
        linked_contact_name: 'John Doe',
        project_identity: 'Test Project',
        timing_signal: 'Construction start Q3 2026',
        fit_risk_note: 'Good fit for BLU Standard',
        owner: 'actor-1',
      },
      'actor-1',
    )
    // First move to under_review
    await transitionProjectSignalAction({
      signal_id: signal.id,
      target_state: 'under_review',
    })
    // Then pass the signal
    const result = await transitionProjectSignalAction({
      signal_id: signal.id,
      target_state: 'passed',
    })
    expect(result.success).toBe(true)
    expect(result.data?.status).toBe('passed')
    expect(result.data?.gate_outcome).toBe('passed')
    expect(result.data?.gate_decision_by).toBeDefined()
    expect(result.data?.gate_decision_date).toBeDefined()
  })

  it('rejects invalid transition (received → passed)', async () => {
    const signal = createProjectSignal(
      {
        signal_type: 'referral',
        source_evidence: 'Evidence',
        linked_client_id: clientId,
        linked_client_name: 'Test Client',
        project_identity: 'Test',
        timing_signal: null,
        fit_risk_note: null,
        owner: 'actor-1',
      },
      'actor-1',
    )
    const result = await transitionProjectSignalAction({
      signal_id: signal.id,
      target_state: 'passed',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('No transition defined')
  })

  it('returns error for non-existent signal', async () => {
    const result = await transitionProjectSignalAction({
      signal_id: 'non-existent',
      target_state: 'under_review',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})

describe('Project Signal Server Actions — Get & List', () => {
  it('gets a signal by ID', async () => {
    const signal = createProjectSignal(
      {
        signal_type: 'referral',
        source_evidence: 'Evidence',
        linked_client_id: clientId,
        linked_client_name: 'Test Client',
        project_identity: 'Get Me',
        timing_signal: null,
        fit_risk_note: null,
        owner: 'actor-1',
      },
      'actor-1',
    )
    const result = await getProjectSignalAction(signal.id)
    expect(result.success).toBe(true)
    expect(result.data?.project_identity).toBe('Get Me')
  })

  it('returns error for non-existent ID', async () => {
    const result = await getProjectSignalAction('bad-id')
    expect(result.success).toBe(false)
  })

  it('lists all signals', async () => {
    createProjectSignal(
      { signal_type: 'referral', source_evidence: 'A', linked_client_id: clientId, linked_client_name: 'Test Client', project_identity: 'A', timing_signal: null, fit_risk_note: null, owner: 'actor-1' },
      'actor-1',
    )
    createProjectSignal(
      { signal_type: 'referral', source_evidence: 'B', linked_client_id: clientId, linked_client_name: 'Test Client', project_identity: 'B', timing_signal: null, fit_risk_note: null, owner: 'actor-1' },
      'actor-1',
    )
    const result = await listProjectSignalsAction()
    expect(result.success).toBe(true)
    expect(result.data?.length).toBe(2)
  })
})
