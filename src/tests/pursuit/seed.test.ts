import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb, list } from '@/lib/db/json-db'
import { seedClients, seedContacts, seedPursuits } from '@/lib/db/seed'
import type { Pursuit, Client } from '@/types/commercial'

beforeEach(() => {
  resetDb()
})

describe('Pursuit Seed Data', () => {
  it('seeds 3 pursuits', () => {
    seedPursuits()
    const pursuits = list<Pursuit>('pursuits')
    expect(pursuits.length).toBe(3)
  })

  it('assigns sequential PUR-XXXX reference IDs', () => {
    seedPursuits()
    const pursuits = list<Pursuit>('pursuits')
    const refs = pursuits.map((p) => p.reference_id).sort()
    expect(refs).toEqual(['PUR-0001', 'PUR-0002', 'PUR-0003'])
  })

  it('seeds Crunch Fitness Lewisville with correct data', () => {
    seedPursuits()
    const pursuits = list<Pursuit>('pursuits')
    const crunch = pursuits.find((p) => p.project_name === 'Crunch Fitness Lewisville')
    expect(crunch).toBeDefined()
    expect(crunch!.client_name).toBe('Summit Peak Builders')
    expect(crunch!.stage).toBe('estimate_ready')
    expect(crunch!.build_type).toBe('gym_fitness')
    expect(crunch!.approx_sqft).toBe(32500)
    expect(crunch!.location).toBe('Lewisville, TX')
  })

  it('seeds Data Center Garland Phase 2 with correct data', () => {
    seedPursuits()
    const pursuits = list<Pursuit>('pursuits')
    const dc = pursuits.find((p) => p.project_name === 'Data Center Garland Phase 2')
    expect(dc).toBeDefined()
    expect(dc!.client_name).toBe('Balfour Beatty')
    expect(dc!.stage).toBe('qualification_underway')
    expect(dc!.build_type).toBe('data_center')
    expect(dc!.approx_sqft).toBe(85000)
  })

  it('seeds Marriott TI Frisco with correct data', () => {
    seedPursuits()
    const pursuits = list<Pursuit>('pursuits')
    const marriott = pursuits.find((p) => p.project_name === 'Marriott TI Frisco')
    expect(marriott).toBeDefined()
    expect(marriott!.client_name).toBe("Rogers-O'Brien")
    expect(marriott!.stage).toBe('project_signal_received')
    expect(marriott!.build_type).toBe('hospitality')
    expect(marriott!.approx_sqft).toBe(18000)
  })

  it('links pursuits to existing clients', () => {
    seedPursuits()
    const pursuits = list<Pursuit>('pursuits')
    const clients = list<Client>('clients')

    for (const pursuit of pursuits) {
      const client = clients.find((c) => c.id === pursuit.client_id)
      expect(client).toBeDefined()
      expect(client!.name).toBe(pursuit.client_name)
    }
  })

  it('links primary contacts where specified', () => {
    seedPursuits()
    const pursuits = list<Pursuit>('pursuits')
    const crunch = pursuits.find((p) => p.project_name === 'Crunch Fitness Lewisville')
    expect(crunch!.primary_contact_id).toBeDefined()
    expect(crunch!.primary_contact_name).toBe('Megan Torres')
  })

  it('does not re-seed if pursuits already exist', () => {
    seedPursuits()
    seedPursuits() // Second call should be a no-op
    const pursuits = list<Pursuit>('pursuits')
    expect(pursuits.length).toBe(3)
  })

  it('ensures clients are seeded first', () => {
    // Call seedPursuits without calling seedClients first
    seedPursuits()
    const clients = list<Client>('clients')
    expect(clients.length).toBeGreaterThan(0)
  })
})
