import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb, list } from '@/lib/db/json-db'
import { seedClients, seedContacts, seedProjectSignals } from '@/lib/db/seed'
import type { ProjectSignal, Client } from '@/types/commercial'

beforeEach(() => {
  resetDb()
})

describe('Project Signal Seed Data', () => {
  it('seeds 5 project signals', () => {
    seedProjectSignals()
    const signals = list<ProjectSignal>('project_signals')
    expect(signals.length).toBe(5)
  })

  it('does not double-seed', () => {
    seedProjectSignals()
    seedProjectSignals()
    const signals = list<ProjectSignal>('project_signals')
    expect(signals.length).toBe(5)
  })

  it('assigns SIG-0001 through SIG-0005', () => {
    seedProjectSignals()
    const signals = list<ProjectSignal>('project_signals')
    const refs = signals.map((s) => s.reference_id).sort()
    expect(refs).toEqual(['SIG-0001', 'SIG-0002', 'SIG-0003', 'SIG-0004', 'SIG-0005'])
  })

  it('seeds Crunch Fitness as passed signal', () => {
    seedProjectSignals()
    const signals = list<ProjectSignal>('project_signals')
    const crunch = signals.find((s) => s.project_identity === 'Crunch Fitness Lewisville')
    expect(crunch).toBeDefined()
    expect(crunch!.status).toBe('passed')
    expect(crunch!.gate_outcome).toBe('passed')
    expect(crunch!.signal_type).toBe('referral')
    expect(crunch!.linked_client_name).toBe('Summit Peak Builders')
  })

  it('seeds Medical Office Plano as under_review', () => {
    seedProjectSignals()
    const signals = list<ProjectSignal>('project_signals')
    const medical = signals.find((s) => s.project_identity === 'Medical Office Plano')
    expect(medical).toBeDefined()
    expect(medical!.status).toBe('under_review')
    expect(medical!.gate_outcome).toBe('pending')
    expect(medical!.signal_type).toBe('event_network')
  })

  it('seeds Warehouse Conversion Houston as deferred', () => {
    seedProjectSignals()
    const signals = list<ProjectSignal>('project_signals')
    const warehouse = signals.find((s) => s.project_identity.includes('Warehouse'))
    expect(warehouse).toBeDefined()
    expect(warehouse!.status).toBe('deferred')
    expect(warehouse!.gate_outcome).toBe('deferred')
  })

  it('links signals to existing clients', () => {
    seedProjectSignals()
    const signals = list<ProjectSignal>('project_signals')
    const clients = list<Client>('clients')

    for (const signal of signals) {
      const client = clients.find((c) => c.id === signal.linked_client_id)
      expect(client).toBeDefined()
      expect(client!.name).toBe(signal.linked_client_name)
    }
  })

  it('links contacts where specified', () => {
    seedProjectSignals()
    const signals = list<ProjectSignal>('project_signals')
    const crunch = signals.find((s) => s.project_identity === 'Crunch Fitness Lewisville')
    expect(crunch!.linked_contact_id).toBeDefined()
    expect(crunch!.linked_contact_name).toBe('Megan Torres')
  })

  it('3 signals are passed, 1 under_review, 1 deferred', () => {
    seedProjectSignals()
    const signals = list<ProjectSignal>('project_signals')
    const passed = signals.filter((s) => s.status === 'passed')
    const underReview = signals.filter((s) => s.status === 'under_review')
    const deferred = signals.filter((s) => s.status === 'deferred')
    expect(passed.length).toBe(3)
    expect(underReview.length).toBe(1)
    expect(deferred.length).toBe(1)
  })

  it('ensures clients are seeded first', () => {
    seedProjectSignals()
    const clients = list<Client>('clients')
    expect(clients.length).toBeGreaterThan(0)
  })
})
