import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from '@/lib/db/json-db'
import {
  seedClients,
  seedContacts,
  seedProjectSignals,
  seedPursuits,
  seedEstimates,
  seedProposals,
  seedAwardHandoffs,
  seedProjects,
  seedMobilizations,
} from '@/lib/db/seed'
import * as mobilizationDb from '@/lib/db/mobilizations'

describe('Mobilization Seed Data', () => {
  beforeEach(() => {
    resetDb()
  })

  it('seeds 2 mobilizations', () => {
    seedClients()
    seedContacts()
    seedProjectSignals()
    seedPursuits()
    seedEstimates()
    seedProposals()
    seedAwardHandoffs()
    seedProjects()
    seedMobilizations()

    const mobs = mobilizationDb.listMobilizations()
    expect(mobs.length).toBe(2)
  })

  it('creates Trip 1 at needs_planning', () => {
    seedClients()
    seedContacts()
    seedProjectSignals()
    seedPursuits()
    seedEstimates()
    seedProposals()
    seedAwardHandoffs()
    seedProjects()
    seedMobilizations()

    const mobs = mobilizationDb.listMobilizations()
    const trip1 = mobs.find((m) => m.stage_name === 'Trip 1 — Rough Clean')
    expect(trip1).toBeDefined()
    expect(trip1!.status).toBe('needs_planning')
    expect(trip1!.reference_id).toBe('MOB-0001')
    expect(trip1!.crew_lead_id).toBe('marcus-johnson')
    expect(trip1!.travel_posture).toBe('local')
    expect(trip1!.readiness_checklist.crew_confirmed).toBe(true)
  })

  it('creates Trip 2 at handoff_incomplete', () => {
    seedClients()
    seedContacts()
    seedProjectSignals()
    seedPursuits()
    seedEstimates()
    seedProposals()
    seedAwardHandoffs()
    seedProjects()
    seedMobilizations()

    const mobs = mobilizationDb.listMobilizations()
    const trip2 = mobs.find((m) => m.stage_name === 'Trip 2 — Final Clean')
    expect(trip2).toBeDefined()
    expect(trip2!.status).toBe('handoff_incomplete')
    expect(trip2!.reference_id).toBe('MOB-0002')
    expect(trip2!.missing_items_log).toBeDefined()
    expect(trip2!.missing_items_log!.length).toBe(2)
  })

  it('is idempotent', () => {
    seedClients()
    seedContacts()
    seedProjectSignals()
    seedPursuits()
    seedEstimates()
    seedProposals()
    seedAwardHandoffs()
    seedProjects()
    seedMobilizations()
    seedMobilizations() // second call should be no-op

    const mobs = mobilizationDb.listMobilizations()
    expect(mobs.length).toBe(2)
  })
})
