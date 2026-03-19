import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import { listClients } from '@/lib/db/clients'
import { listContacts } from '@/lib/db/contacts'
import { seedClients, seedContacts } from '@/lib/db/seed'
import type { Contact, ContactLayer } from '@/types/commercial'

beforeEach(() => {
  resetDb()
  seedClients()
  seedContacts()
})

function getClientHealth(clientName: string) {
  const clients = listClients()
  const contacts = listContacts()
  const client = clients.find((c) => c.name.includes(clientName))!
  const clientContacts = contacts.filter((c) => c.client_id === client.id)
  const layers = new Set<ContactLayer>(clientContacts.map((c: Contact) => c.layer))
  return {
    contactCount: clientContacts.length,
    layerCount: layers.size,
    meetsThreshold: clientContacts.length >= 3 && layers.size >= 2,
  }
}

describe('Multi-Threading Health — CORE-01 Coverage Analysis', () => {
  it('Rogers-O\'Brien has 3 contacts across 3 layers → meets threshold', () => {
    const health = getClientHealth('Rogers')
    expect(health.contactCount).toBe(3)
    expect(health.layerCount).toBe(3) // pm_super_field, exec_owner_rep, coordinator_admin
    expect(health.meetsThreshold).toBe(true)
  })

  it('Summit Peak has 2 contacts across 1 layer → does not meet threshold', () => {
    const health = getClientHealth('Summit')
    expect(health.contactCount).toBe(2)
    expect(health.layerCount).toBe(1) // both pm_super_field
    expect(health.meetsThreshold).toBe(false)
  })

  it('Balfour Beatty has 2 contacts across 2 layers → does not meet (needs 3+)', () => {
    const health = getClientHealth('Balfour')
    expect(health.contactCount).toBe(2)
    expect(health.layerCount).toBe(2) // estimator_precon, coordinator_admin
    expect(health.meetsThreshold).toBe(false)
  })

  it('HBA Design Build has 1 contact across 1 layer → does not meet', () => {
    const health = getClientHealth('HBA')
    expect(health.contactCount).toBe(1)
    expect(health.layerCount).toBe(1)
    expect(health.meetsThreshold).toBe(false)
  })
})
