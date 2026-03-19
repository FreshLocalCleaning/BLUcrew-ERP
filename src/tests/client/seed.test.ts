import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import { listClients } from '@/lib/db/clients'
import { seedClients } from '@/lib/db/seed'
import type { ClientState } from '@/lib/state-machines/client'

beforeEach(() => {
  resetDb()
})

describe('Client Seed Data', () => {
  it('seeds 6 sample clients', () => {
    seedClients()
    const clients = listClients()
    expect(clients.length).toBe(6)
  })

  it('does not double-seed', () => {
    seedClients()
    seedClients()
    const clients = listClients()
    expect(clients.length).toBe(6)
  })

  it('assigns correct reference IDs CLT-0001 through CLT-0006', () => {
    seedClients()
    const clients = listClients()
    const refs = clients.map((c) => c.reference_id).sort()
    expect(refs).toEqual([
      'CLT-0001',
      'CLT-0002',
      'CLT-0003',
      'CLT-0004',
      'CLT-0005',
      'CLT-0006',
    ])
  })

  it('seeds Summit Peak Builders as Active Customer', () => {
    seedClients()
    const summit = listClients().find((c) => c.name === 'Summit Peak Builders')
    expect(summit).toBeDefined()
    expect(summit!.status).toBe('active_customer' as ClientState)
    expect(summit!.tier).toBe('A')
    expect(summit!.market).toBe('dallas_fort_worth')
  })

  it('seeds HBA Design Build as Target Client', () => {
    seedClients()
    const hba = listClients().find((c) => c.name === 'HBA Design Build')
    expect(hba).toBeDefined()
    expect(hba!.status).toBe('target_client' satisfies ClientState)
    expect(hba!.tier).toBe('A')
  })

  it('seeds Balfour Beatty as Developing Relationship', () => {
    seedClients()
    const bb = listClients().find((c) => c.name === 'Balfour Beatty')
    expect(bb).toBeDefined()
    expect(bb!.status).toBe('developing_relationship' satisfies ClientState)
    expect(bb!.tier).toBe('B')
    expect(bb!.market).toBe('north_texas')
  })

  it('seeds Austin Commercial as Watchlist', () => {
    seedClients()
    const ac = listClients().find((c) => c.name === 'Austin Commercial')
    expect(ac).toBeDefined()
    expect(ac!.status).toBe('watchlist' satisfies ClientState)
    expect(ac!.market).toBe('austin')
  })

  it('seeds Rogers-O\'Brien as Active Customer', () => {
    seedClients()
    const ro = listClients().find((c) => c.name.includes('Rogers'))
    expect(ro).toBeDefined()
    expect(ro!.status).toBe('active_customer' as ClientState)
    expect(ro!.tier).toBe('A')
  })

  it('seeds Whiting-Turner as Dormant', () => {
    seedClients()
    const wt = listClients().find((c) => c.name === 'Whiting-Turner')
    expect(wt).toBeDefined()
    expect(wt!.status).toBe('dormant' satisfies ClientState)
    expect(wt!.tier).toBe('C')
    expect(wt!.market).toBe('houston')
  })

  it('all seeded clients have contacts as empty array', () => {
    seedClients()
    const clients = listClients()
    for (const c of clients) {
      expect(c.contacts).toEqual([])
    }
  })

  it('all seeded clients have audit log entries', () => {
    seedClients()
    const clients = listClients()
    for (const c of clients) {
      expect(c.created_by).toBe('system-seed')
    }
  })
})
