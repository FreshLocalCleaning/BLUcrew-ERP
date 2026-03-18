import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import { createClient } from '@/lib/db/clients'
import {
  createContact,
  getContact,
  listContacts,
  listContactsByClient,
  updateContact,
  archiveContact,
  getContactAuditLog,
  generateReferenceId,
} from '@/lib/db/contacts'
import type { Contact } from '@/types/commercial'

let clientId: string

beforeEach(() => {
  resetDb()
  const client = createClient({ name: 'Test Client' }, 'actor-1')
  clientId = client.id
})

function makeContact(overrides: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'is_deleted' | 'reference_id' | 'touch_count'>> = {}) {
  return {
    first_name: 'John',
    last_name: 'Doe',
    client_id: clientId,
    client_name: 'Test Client',
    layer: 'pm_super_field' as const,
    influence: 'medium' as const,
    is_champion: false,
    relationship_strength: 'new' as const,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Reference ID generation
// ---------------------------------------------------------------------------

describe('Contact Data Access — Reference ID', () => {
  it('generates CON-0001 for first contact', () => {
    expect(generateReferenceId()).toBe('CON-0001')
  })

  it('increments reference ID', () => {
    createContact(makeContact(), 'actor-1')
    expect(generateReferenceId()).toBe('CON-0002')
  })
})

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

describe('Contact Data Access — Create', () => {
  it('creates a contact with defaults', () => {
    const contact = createContact(makeContact(), 'actor-1')
    expect(contact.id).toBeDefined()
    expect(contact.first_name).toBe('John')
    expect(contact.last_name).toBe('Doe')
    expect(contact.reference_id).toBe('CON-0001')
    expect(contact.touch_count).toBe(0)
    expect(contact.client_id).toBe(clientId)
    expect(contact.is_deleted).toBe(false)
  })

  it('creates audit log entry', () => {
    const contact = createContact(makeContact(), 'actor-1')
    const log = getContactAuditLog(contact.id)
    expect(log.length).toBe(1)
    expect(log[0]!.action).toBe('create')
  })

  it('creates champion contact', () => {
    const contact = createContact(
      makeContact({
        is_champion: true,
        champion_reason: 'Always advocates for us',
      }),
      'actor-1',
    )
    expect(contact.is_champion).toBe(true)
    expect(contact.champion_reason).toBe('Always advocates for us')
  })
})

describe('Contact Data Access — Read', () => {
  it('gets contact by ID', () => {
    const created = createContact(makeContact(), 'actor-1')
    const fetched = getContact(created.id)
    expect(fetched).toBeDefined()
    expect(fetched!.first_name).toBe('John')
  })

  it('returns undefined for non-existent', () => {
    expect(getContact('bad-id')).toBeUndefined()
  })

  it('returns undefined for soft-deleted', () => {
    const created = createContact(makeContact(), 'actor-1')
    archiveContact(created.id, 'actor-1', 'Removed')
    expect(getContact(created.id)).toBeUndefined()
  })

  it('lists all contacts', () => {
    createContact(makeContact({ first_name: 'A' }), 'actor-1')
    createContact(makeContact({ first_name: 'B' }), 'actor-1')
    expect(listContacts().length).toBe(2)
  })

  it('filters by client', () => {
    const otherClient = createClient({ name: 'Other' }, 'actor-1')
    createContact(makeContact({ first_name: 'A' }), 'actor-1')
    createContact(
      makeContact({ first_name: 'B', client_id: otherClient.id, client_name: 'Other' }),
      'actor-1',
    )
    const byClient = listContactsByClient(clientId)
    expect(byClient.length).toBe(1)
    expect(byClient[0]!.first_name).toBe('A')
  })
})

describe('Contact Data Access — Update', () => {
  it('updates contact fields', () => {
    const created = createContact(makeContact(), 'actor-1')
    const updated = updateContact(
      created.id,
      { relationship_strength: 'trusted', touch_count: 5 },
      'actor-2',
    )
    expect(updated.relationship_strength).toBe('trusted')
    expect(updated.touch_count).toBe(5)
    expect(updated.updated_by).toBe('actor-2')
  })

  it('logs field changes', () => {
    const created = createContact(makeContact(), 'actor-1')
    updateContact(created.id, { influence: 'high' }, 'actor-2', 'Upgraded')
    const log = getContactAuditLog(created.id)
    expect(log.length).toBe(2)
    expect(log[1]!.field_changes['influence']).toEqual({ from: 'medium', to: 'high' })
    expect(log[1]!.reason).toBe('Upgraded')
  })

  it('throws for non-existent', () => {
    expect(() => updateContact('bad-id', { influence: 'high' }, 'a')).toThrow()
  })
})

describe('Contact Data Access — Soft Delete', () => {
  it('soft-deletes a contact', () => {
    const created = createContact(makeContact(), 'actor-1')
    archiveContact(created.id, 'actor-1', 'Left company')
    expect(listContacts().length).toBe(0)
  })

  it('logs soft delete reason', () => {
    const created = createContact(makeContact(), 'actor-1')
    archiveContact(created.id, 'actor-1', 'Left company')
    const log = getContactAuditLog(created.id)
    const deleteEntry = log.find((e) => e.action === 'delete')
    expect(deleteEntry).toBeDefined()
    expect(deleteEntry!.reason).toBe('Left company')
  })
})
