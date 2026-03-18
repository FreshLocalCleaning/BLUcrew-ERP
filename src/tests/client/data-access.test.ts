import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import {
  createClient,
  getClient,
  listClients,
  updateClient,
  archiveClient,
  getClientAuditLog,
  generateReferenceId,
} from '@/lib/db/clients'

beforeEach(() => {
  resetDb()
})

// ---------------------------------------------------------------------------
// Reference ID generation
// ---------------------------------------------------------------------------

describe('Client Data Access — Reference ID', () => {
  it('generates CLT-0001 for first client', () => {
    const ref = generateReferenceId()
    expect(ref).toBe('CLT-0001')
  })

  it('increments reference ID for each client', () => {
    createClient({ name: 'First' }, 'actor-1')
    const ref = generateReferenceId()
    expect(ref).toBe('CLT-0002')
  })

  it('pads reference ID to 4 digits', () => {
    // Create 9 clients
    for (let i = 0; i < 9; i++) {
      createClient({ name: `Client ${i}` }, 'actor-1')
    }
    const ref = generateReferenceId()
    expect(ref).toBe('CLT-0010')
  })
})

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

describe('Client Data Access — Create', () => {
  it('creates a client with default status watchlist', () => {
    const client = createClient(
      {
        name: 'Test Client',
        tier: 'A',
        vertical: 'general_contractor',
        market: 'dallas_fort_worth',
      },
      'actor-1',
    )
    expect(client.id).toBeDefined()
    expect(client.name).toBe('Test Client')
    expect(client.status).toBe('watchlist')
    expect(client.reference_id).toBe('CLT-0001')
    expect(client.contacts).toEqual([])
    expect(client.is_deleted).toBe(false)
    expect(client.created_by).toBe('actor-1')
  })

  it('creates an audit log entry on create', () => {
    const client = createClient({ name: 'Audited Client' }, 'actor-1')
    const log = getClientAuditLog(client.id)
    expect(log.length).toBe(1)
    expect(log[0]!.action).toBe('create')
    expect(log[0]!.actor_id).toBe('actor-1')
  })
})

describe('Client Data Access — Read', () => {
  it('gets a client by ID', () => {
    const created = createClient({ name: 'Get Me' }, 'actor-1')
    const fetched = getClient(created.id)
    expect(fetched).toBeDefined()
    expect(fetched!.name).toBe('Get Me')
  })

  it('returns undefined for non-existent ID', () => {
    const fetched = getClient('non-existent')
    expect(fetched).toBeUndefined()
  })

  it('returns undefined for soft-deleted client', () => {
    const created = createClient({ name: 'To Delete' }, 'actor-1')
    archiveClient(created.id, 'actor-1', 'Testing')
    const fetched = getClient(created.id)
    expect(fetched).toBeUndefined()
  })

  it('lists all non-deleted clients', () => {
    createClient({ name: 'A' }, 'actor-1')
    createClient({ name: 'B' }, 'actor-1')
    const deleted = createClient({ name: 'C' }, 'actor-1')
    archiveClient(deleted.id, 'actor-1', 'Testing')

    const all = listClients()
    expect(all.length).toBe(2)
    expect(all.map((c) => c.name).sort()).toEqual(['A', 'B'])
  })
})

describe('Client Data Access — Update', () => {
  it('updates client fields', () => {
    const created = createClient({ name: 'Old Name' }, 'actor-1')
    const updated = updateClient(created.id, { name: 'New Name', tier: 'B' }, 'actor-2')
    expect(updated.name).toBe('New Name')
    expect(updated.tier).toBe('B')
    expect(updated.updated_by).toBe('actor-2')
  })

  it('logs field changes in audit', () => {
    const created = createClient({ name: 'Original' }, 'actor-1')
    updateClient(created.id, { name: 'Changed' }, 'actor-2', 'Renamed')
    const log = getClientAuditLog(created.id)
    expect(log.length).toBe(2) // create + update
    const updateEntry = log[1]!
    expect(updateEntry.action).toBe('update')
    expect(updateEntry.field_changes['name']).toEqual({ from: 'Original', to: 'Changed' })
    expect(updateEntry.reason).toBe('Renamed')
  })

  it('throws for non-existent client', () => {
    expect(() => updateClient('bad-id', { name: 'X' }, 'actor-1')).toThrow()
  })
})

describe('Client Data Access — Soft Delete', () => {
  it('soft-deletes a client', () => {
    const created = createClient({ name: 'To Archive' }, 'actor-1')
    archiveClient(created.id, 'actor-1', 'No longer relevant')

    const fetched = getClient(created.id)
    expect(fetched).toBeUndefined()

    const all = listClients()
    expect(all.length).toBe(0)
  })

  it('logs soft delete in audit', () => {
    const created = createClient({ name: 'Audit Archive' }, 'actor-1')
    archiveClient(created.id, 'actor-1', 'Closed account')
    const log = getClientAuditLog(created.id)
    const deleteEntry = log.find((e) => e.action === 'delete')
    expect(deleteEntry).toBeDefined()
    expect(deleteEntry!.reason).toBe('Closed account')
  })

  it('throws when archiving non-existent client', () => {
    expect(() => archiveClient('bad-id', 'actor-1', 'reason')).toThrow()
  })
})
