import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import { listContacts } from '@/lib/db/contacts'
import { listClients } from '@/lib/db/clients'
import { seedClients, seedContacts } from '@/lib/db/seed'

beforeEach(() => {
  resetDb()
})

describe('Contact Seed Data', () => {
  it('seeds 8 contacts', () => {
    seedClients()
    seedContacts()
    expect(listContacts().length).toBe(8)
  })

  it('does not double-seed', () => {
    seedClients()
    seedContacts()
    seedContacts()
    expect(listContacts().length).toBe(8)
  })

  it('assigns CON-0001 through CON-0008', () => {
    seedClients()
    seedContacts()
    const refs = listContacts().map((c) => c.reference_id).sort()
    expect(refs).toEqual([
      'CON-0001', 'CON-0002', 'CON-0003', 'CON-0004',
      'CON-0005', 'CON-0006', 'CON-0007', 'CON-0008',
    ])
  })

  it('Megan Torres is a champion with trusted relationship at Summit Peak', () => {
    seedClients()
    seedContacts()
    const megan = listContacts().find((c) => c.first_name === 'Megan' && c.last_name === 'Torres')
    expect(megan).toBeDefined()
    expect(megan!.is_champion).toBe(true)
    expect(megan!.relationship_strength).toBe('trusted')
    expect(megan!.client_name).toBe('Summit Peak Builders')
    expect(megan!.layer).toBe('pm_super_field')
  })

  it('Chris Dalton is active, not champion, at Summit Peak', () => {
    seedClients()
    seedContacts()
    const chris = listContacts().find((c) => c.last_name === 'Dalton')
    expect(chris).toBeDefined()
    expect(chris!.is_champion).toBe(false)
    expect(chris!.relationship_strength).toBe('active')
    expect(chris!.client_name).toBe('Summit Peak Builders')
  })

  it('Rachel Kim is developing at Rogers-O\'Brien exec layer', () => {
    seedClients()
    seedContacts()
    const rachel = listContacts().find((c) => c.last_name === 'Kim')
    expect(rachel).toBeDefined()
    expect(rachel!.relationship_strength).toBe('developing')
    expect(rachel!.layer).toBe('exec_owner_rep')
    expect(rachel!.client_name).toContain('Rogers')
  })

  it('Jake Moreno is a champion with trusted relationship', () => {
    seedClients()
    seedContacts()
    const jake = listContacts().find((c) => c.last_name === 'Moreno')
    expect(jake).toBeDefined()
    expect(jake!.is_champion).toBe(true)
    expect(jake!.relationship_strength).toBe('trusted')
    expect(jake!.touch_count).toBe(31)
  })

  it('David Park is precon layer at Balfour Beatty', () => {
    seedClients()
    seedContacts()
    const david = listContacts().find((c) => c.last_name === 'Park')
    expect(david).toBeDefined()
    expect(david!.layer).toBe('estimator_precon')
    expect(david!.client_name).toBe('Balfour Beatty')
    expect(david!.relationship_strength).toBe('developing')
  })

  it('Lisa Chen is coordinator layer, new relationship', () => {
    seedClients()
    seedContacts()
    const lisa = listContacts().find((c) => c.first_name === 'Lisa' && c.last_name === 'Chen')
    expect(lisa).toBeDefined()
    expect(lisa!.layer).toBe('coordinator_admin')
    expect(lisa!.relationship_strength).toBe('new')
    expect(lisa!.influence).toBe('low')
  })

  it('Tom Rivera is exec layer at HBA, new relationship', () => {
    seedClients()
    seedContacts()
    const tom = listContacts().find((c) => c.last_name === 'Rivera')
    expect(tom).toBeDefined()
    expect(tom!.layer).toBe('exec_owner_rep')
    expect(tom!.client_name).toBe('HBA Design Build')
    expect(tom!.relationship_strength).toBe('new')
  })

  it('Maria Santos is coordinator at Rogers-O\'Brien, active', () => {
    seedClients()
    seedContacts()
    const maria = listContacts().find((c) => c.last_name === 'Santos')
    expect(maria).toBeDefined()
    expect(maria!.layer).toBe('coordinator_admin')
    expect(maria!.relationship_strength).toBe('active')
    expect(maria!.client_name).toContain('Rogers')
  })

  it('links contacts to clients via contacts array', () => {
    seedClients()
    seedContacts()
    const clients = listClients()
    const contacts = listContacts()

    // Summit Peak should have 2 contacts
    const summit = clients.find((c) => c.name === 'Summit Peak Builders')!
    const summitContacts = contacts.filter((c) => c.client_id === summit.id)
    expect(summitContacts.length).toBe(2)
    expect(summit.contacts.length).toBe(2)

    // Rogers-O'Brien should have 3 contacts
    const rogers = clients.find((c) => c.name.includes('Rogers'))!
    const rogersContacts = contacts.filter((c) => c.client_id === rogers.id)
    expect(rogersContacts.length).toBe(3)

    // Balfour Beatty should have 2 contacts
    const balfour = clients.find((c) => c.name === 'Balfour Beatty')!
    const balfourContacts = contacts.filter((c) => c.client_id === balfour.id)
    expect(balfourContacts.length).toBe(2)

    // HBA should have 1 contact
    const hba = clients.find((c) => c.name === 'HBA Design Build')!
    const hbaContacts = contacts.filter((c) => c.client_id === hba.id)
    expect(hbaContacts.length).toBe(1)
  })

  it('2 total champions seeded', () => {
    seedClients()
    seedContacts()
    const champions = listContacts().filter((c) => c.is_champion)
    expect(champions.length).toBe(2)
    const names = champions.map((c) => c.last_name).sort()
    expect(names).toEqual(['Moreno', 'Torres'])
  })
})
