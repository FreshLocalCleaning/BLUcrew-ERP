import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import {
  createPursuit,
  getPursuit,
  listPursuits,
  listPursuitsByClient,
  updatePursuit,
  archivePursuit,
  getPursuitAuditLog,
  generateReferenceId,
} from '@/lib/db/pursuits'

beforeEach(() => {
  resetDb()
})

// ---------------------------------------------------------------------------
// Reference ID generation
// ---------------------------------------------------------------------------

describe('Pursuit Data Access — Reference ID', () => {
  it('generates PUR-0001 for first pursuit', () => {
    const ref = generateReferenceId()
    expect(ref).toBe('PUR-0001')
  })

  it('increments reference ID for each pursuit', () => {
    createPursuit(
      { project_name: 'First', client_id: 'c1', client_name: 'Client 1' },
      'actor-1',
    )
    const ref = generateReferenceId()
    expect(ref).toBe('PUR-0002')
  })

  it('pads reference ID to 4 digits', () => {
    for (let i = 0; i < 9; i++) {
      createPursuit(
        { project_name: `Project ${i}`, client_id: 'c1', client_name: 'Client 1' },
        'actor-1',
      )
    }
    const ref = generateReferenceId()
    expect(ref).toBe('PUR-0010')
  })
})

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

describe('Pursuit Data Access — Create', () => {
  it('creates a pursuit with default stage project_signal_received', () => {
    const pursuit = createPursuit(
      {
        project_name: 'Test Project',
        client_id: 'c1',
        client_name: 'Test Client',
        build_type: 'gym_fitness',
        location: 'Dallas, TX',
        approx_sqft: 25000,
      },
      'actor-1',
    )
    expect(pursuit.id).toBeDefined()
    expect(pursuit.project_name).toBe('Test Project')
    expect(pursuit.stage).toBe('project_signal_received')
    expect(pursuit.reference_id).toBe('PUR-0001')
    expect(pursuit.client_id).toBe('c1')
    expect(pursuit.client_name).toBe('Test Client')
    expect(pursuit.build_type).toBe('gym_fitness')
    expect(pursuit.approx_sqft).toBe(25000)
    expect(pursuit.is_deleted).toBe(false)
    expect(pursuit.created_by).toBe('actor-1')
  })

  it('creates an audit log entry on create', () => {
    const pursuit = createPursuit(
      { project_name: 'Audited', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    const log = getPursuitAuditLog(pursuit.id)
    expect(log.length).toBe(1)
    expect(log[0]!.action).toBe('create')
    expect(log[0]!.actor_id).toBe('actor-1')
  })

  it('allows setting a custom stage on create', () => {
    const pursuit = createPursuit(
      {
        project_name: 'Custom Stage',
        client_id: 'c1',
        client_name: 'C1',
        stage: 'qualification_underway',
      },
      'actor-1',
    )
    expect(pursuit.stage).toBe('qualification_underway')
  })
})

describe('Pursuit Data Access — Read', () => {
  it('gets a pursuit by ID', () => {
    const created = createPursuit(
      { project_name: 'Get Me', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    const fetched = getPursuit(created.id)
    expect(fetched).toBeDefined()
    expect(fetched!.project_name).toBe('Get Me')
  })

  it('returns undefined for non-existent ID', () => {
    const fetched = getPursuit('non-existent')
    expect(fetched).toBeUndefined()
  })

  it('returns undefined for soft-deleted pursuit', () => {
    const created = createPursuit(
      { project_name: 'To Delete', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    archivePursuit(created.id, 'actor-1', 'Testing')
    const fetched = getPursuit(created.id)
    expect(fetched).toBeUndefined()
  })

  it('lists all non-deleted pursuits', () => {
    createPursuit({ project_name: 'A', client_id: 'c1', client_name: 'C1' }, 'actor-1')
    createPursuit({ project_name: 'B', client_id: 'c1', client_name: 'C1' }, 'actor-1')
    const deleted = createPursuit(
      { project_name: 'C', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    archivePursuit(deleted.id, 'actor-1', 'Testing')

    const all = listPursuits()
    expect(all.length).toBe(2)
    expect(all.map((p) => p.project_name).sort()).toEqual(['A', 'B'])
  })

  it('lists pursuits by client', () => {
    createPursuit({ project_name: 'P1', client_id: 'c1', client_name: 'C1' }, 'actor-1')
    createPursuit({ project_name: 'P2', client_id: 'c2', client_name: 'C2' }, 'actor-1')
    createPursuit({ project_name: 'P3', client_id: 'c1', client_name: 'C1' }, 'actor-1')

    const c1Pursuits = listPursuitsByClient('c1')
    expect(c1Pursuits.length).toBe(2)
    expect(c1Pursuits.map((p) => p.project_name).sort()).toEqual(['P1', 'P3'])
  })
})

describe('Pursuit Data Access — Update', () => {
  it('updates pursuit fields', () => {
    const created = createPursuit(
      { project_name: 'Old Name', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    const updated = updatePursuit(
      created.id,
      { project_name: 'New Name', build_type: 'data_center' },
      'actor-2',
    )
    expect(updated.project_name).toBe('New Name')
    expect(updated.build_type).toBe('data_center')
    expect(updated.updated_by).toBe('actor-2')
  })

  it('logs field changes in audit', () => {
    const created = createPursuit(
      { project_name: 'Original', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    updatePursuit(created.id, { project_name: 'Changed' }, 'actor-2', 'Renamed')
    const log = getPursuitAuditLog(created.id)
    expect(log.length).toBe(2) // create + update
    const updateEntry = log[1]!
    expect(updateEntry.action).toBe('update')
    expect(updateEntry.field_changes['project_name']).toEqual({
      from: 'Original',
      to: 'Changed',
    })
    expect(updateEntry.reason).toBe('Renamed')
  })

  it('throws for non-existent pursuit', () => {
    expect(() => updatePursuit('bad-id', { project_name: 'X' }, 'actor-1')).toThrow()
  })
})

describe('Pursuit Data Access — Soft Delete', () => {
  it('soft-deletes a pursuit', () => {
    const created = createPursuit(
      { project_name: 'To Archive', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    archivePursuit(created.id, 'actor-1', 'No longer relevant')

    const fetched = getPursuit(created.id)
    expect(fetched).toBeUndefined()

    const all = listPursuits()
    expect(all.length).toBe(0)
  })

  it('logs soft delete in audit', () => {
    const created = createPursuit(
      { project_name: 'Audit Archive', client_id: 'c1', client_name: 'C1' },
      'actor-1',
    )
    archivePursuit(created.id, 'actor-1', 'Project cancelled')
    const log = getPursuitAuditLog(created.id)
    const deleteEntry = log.find((e) => e.action === 'delete')
    expect(deleteEntry).toBeDefined()
    expect(deleteEntry!.reason).toBe('Project cancelled')
  })

  it('throws when archiving non-existent pursuit', () => {
    expect(() => archivePursuit('bad-id', 'actor-1', 'reason')).toThrow()
  })
})
