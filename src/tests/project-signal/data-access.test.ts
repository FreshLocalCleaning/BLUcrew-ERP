import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import {
  createProjectSignal,
  getProjectSignal,
  listProjectSignals,
  listProjectSignalsByClient,
  updateProjectSignal,
  archiveProjectSignal,
  getProjectSignalAuditLog,
  generateReferenceId,
} from '@/lib/db/project-signals'

beforeEach(() => {
  resetDb()
})

function makeSignal(overrides = {}) {
  return {
    signal_type: 'referral' as const,
    source_evidence: 'Referral from contact',
    linked_client_id: 'c1',
    linked_client_name: 'Test Client',
    project_identity: 'Test Project',
    timing_signal: null,
    fit_risk_note: null,
    owner: 'actor-1',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Reference ID generation
// ---------------------------------------------------------------------------

describe('Project Signal Data Access — Reference ID', () => {
  it('generates SIG-0001 for first signal', () => {
    expect(generateReferenceId()).toBe('SIG-0001')
  })

  it('increments reference ID for each signal', () => {
    createProjectSignal(makeSignal(), 'actor-1')
    expect(generateReferenceId()).toBe('SIG-0002')
  })

  it('pads reference ID to 4 digits', () => {
    for (let i = 0; i < 9; i++) {
      createProjectSignal(makeSignal({ project_identity: `Project ${i}` }), 'actor-1')
    }
    expect(generateReferenceId()).toBe('SIG-0010')
  })
})

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

describe('Project Signal Data Access — Create', () => {
  it('creates a signal with default status received', () => {
    const signal = createProjectSignal(makeSignal(), 'actor-1')
    expect(signal.id).toBeDefined()
    expect(signal.reference_id).toBe('SIG-0001')
    expect(signal.status).toBe('received')
    expect(signal.gate_outcome).toBe('pending')
    expect(signal.gate_decision_by).toBeNull()
    expect(signal.gate_decision_date).toBeNull()
    expect(signal.signal_type).toBe('referral')
    expect(signal.project_identity).toBe('Test Project')
    expect(signal.archive_state).toBe('active')
    expect(signal.created_by).toBe('actor-1')
  })

  it('creates an audit log entry on create', () => {
    const signal = createProjectSignal(makeSignal(), 'actor-1')
    const log = getProjectSignalAuditLog(signal.id)
    expect(log.length).toBe(1)
    expect(log[0]!.action).toBe('create')
    expect(log[0]!.actor_id).toBe('actor-1')
  })
})

describe('Project Signal Data Access — Read', () => {
  it('gets a signal by ID', () => {
    const created = createProjectSignal(makeSignal(), 'actor-1')
    const fetched = getProjectSignal(created.id)
    expect(fetched).toBeDefined()
    expect(fetched!.project_identity).toBe('Test Project')
  })

  it('returns undefined for non-existent ID', () => {
    expect(getProjectSignal('bad-id')).toBeUndefined()
  })

  it('returns undefined for archived signal', () => {
    const created = createProjectSignal(makeSignal(), 'actor-1')
    archiveProjectSignal(created.id, 'actor-1', 'Testing')
    expect(getProjectSignal(created.id)).toBeUndefined()
  })

  it('lists all non-archived signals', () => {
    createProjectSignal(makeSignal({ project_identity: 'A' }), 'actor-1')
    createProjectSignal(makeSignal({ project_identity: 'B' }), 'actor-1')
    const archived = createProjectSignal(makeSignal({ project_identity: 'C' }), 'actor-1')
    archiveProjectSignal(archived.id, 'actor-1', 'Testing')
    expect(listProjectSignals().length).toBe(2)
  })

  it('lists signals by client', () => {
    createProjectSignal(makeSignal({ linked_client_id: 'c1' }), 'actor-1')
    createProjectSignal(makeSignal({ linked_client_id: 'c2', linked_client_name: 'Other' }), 'actor-1')
    createProjectSignal(makeSignal({ linked_client_id: 'c1' }), 'actor-1')
    const byClient = listProjectSignalsByClient('c1')
    expect(byClient.length).toBe(2)
  })
})

describe('Project Signal Data Access — Update', () => {
  it('updates signal fields', () => {
    const created = createProjectSignal(makeSignal(), 'actor-1')
    const updated = updateProjectSignal(created.id, { fit_risk_note: 'Low risk' }, 'actor-2')
    expect(updated.fit_risk_note).toBe('Low risk')
    expect(updated.updated_by).toBe('actor-2')
  })

  it('logs field changes in audit', () => {
    const created = createProjectSignal(makeSignal(), 'actor-1')
    updateProjectSignal(created.id, { gate_outcome: 'passed' }, 'actor-2', 'Gate passed')
    const log = getProjectSignalAuditLog(created.id)
    expect(log.length).toBe(2)
    expect(log[1]!.action).toBe('update')
    expect(log[1]!.reason).toBe('Gate passed')
  })

  it('throws for non-existent signal', () => {
    expect(() => updateProjectSignal('bad-id', { fit_risk_note: 'X' }, 'actor-1')).toThrow()
  })
})

describe('Project Signal Data Access — Soft Delete', () => {
  it('archives a signal', () => {
    const created = createProjectSignal(makeSignal(), 'actor-1')
    archiveProjectSignal(created.id, 'actor-1', 'No longer relevant')
    expect(getProjectSignal(created.id)).toBeUndefined()
    expect(listProjectSignals().length).toBe(0)
  })

  it('logs archive in audit', () => {
    const created = createProjectSignal(makeSignal(), 'actor-1')
    archiveProjectSignal(created.id, 'actor-1', 'Duplicate signal')
    const log = getProjectSignalAuditLog(created.id)
    const deleteEntry = log.find((e) => e.action === 'delete')
    expect(deleteEntry).toBeDefined()
    expect(deleteEntry!.reason).toBe('Duplicate signal')
  })

  it('throws when archiving non-existent signal', () => {
    expect(() => archiveProjectSignal('bad-id', 'actor-1', 'reason')).toThrow()
  })
})
