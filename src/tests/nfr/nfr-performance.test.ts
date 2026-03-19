/**
 * NFR Performance Tests (ERP-20)
 * Verify data access and KPI calculations complete within acceptable bounds.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import * as db from '@/lib/db/json-db'
import {
  seedClients, seedContacts, seedProjectSignals, seedPursuits,
  seedEstimates, seedProposals, seedAwardHandoffs, seedProjects,
  seedMobilizations, seedChangeOrders, seedExpansionTasks,
} from '@/lib/db/seed'
import {
  signalToPursuitConversion, estimateReadyCycleTime, proposalAgingByBucket,
  winRate, nextActionHygiene, pipelineValueByStage, activeAlerts, recentActivity,
} from '@/lib/analytics/kpi-engine'
import { validateTransition } from '@/lib/state-machines/engine'
import { mobilizationStateMachine } from '@/lib/state-machines/mobilization'

function seedAll() {
  seedClients(); seedContacts(); seedProjectSignals(); seedPursuits()
  seedEstimates(); seedProposals(); seedAwardHandoffs(); seedProjects()
  seedMobilizations(); seedChangeOrders(); seedExpansionTasks()
}

describe('NFR — Performance', () => {
  beforeEach(() => { db.resetDb(); seedAll() })

  it('list views return within 50ms with seed data', () => {
    const collections: db.CollectionName[] = [
      'clients', 'contacts', 'pursuits', 'estimates', 'proposals',
      'projects', 'mobilizations', 'change_orders', 'expansion_tasks',
    ]
    for (const col of collections) {
      const start = performance.now()
      db.list(col)
      const elapsed = performance.now() - start
      expect(elapsed).toBeLessThan(50)
    }
  })

  it('state transition validation completes within 5ms', () => {
    const entity = {
      readiness_checklist: { crew_confirmed: true, equipment_loaded: true, travel_booked: true, lodging_booked: true, per_diem_approved: true },
      compressed_planning: false, exception_flag: false, missing_items_log: null,
    }
    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      validateTransition(mobilizationStateMachine, {
        currentState: 'needs_planning', targetState: 'ready',
        entity, actorRoles: ['pm_ops'],
      })
    }
    const avgMs = (performance.now() - start) / 100
    expect(avgMs).toBeLessThan(5)
  })

  it('KPI calculations complete within 100ms each', () => {
    const kpiFns = [
      signalToPursuitConversion, estimateReadyCycleTime, proposalAgingByBucket,
      winRate, nextActionHygiene, pipelineValueByStage, activeAlerts,
    ]
    for (const fn of kpiFns) {
      const start = performance.now()
      fn()
      const elapsed = performance.now() - start
      expect(elapsed).toBeLessThan(100)
    }
  })

  it('recentActivity returns within 50ms', () => {
    const start = performance.now()
    recentActivity(10)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(50)
  })
})
