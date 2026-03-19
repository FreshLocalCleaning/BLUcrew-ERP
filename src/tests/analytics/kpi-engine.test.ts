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
  seedChangeOrders,
  seedExpansionTasks,
} from '@/lib/db/seed'
import {
  signalToPursuitConversion,
  estimateReadyCycleTime,
  proposalAgingByBucket,
  winRate,
  nextActionHygiene,
  jobsAwaitingPMClaim,
  readinessPassRate,
  callbackRate,
  invoiceReleaseSpeed,
  pipelineValueByStage,
  activeAlerts,
  recentActivity,
  lossReasonDistribution,
  arAgingByClient,
  pmReviewClosureRate,
} from '@/lib/analytics/kpi-engine'

function seedAll() {
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()
  seedProjects()
  seedMobilizations()
  seedChangeOrders()
  seedExpansionTasks()
}

describe('KPI Engine — Commercial KPIs', () => {
  beforeEach(() => {
    resetDb()
    seedAll()
  })

  it('signalToPursuitConversion returns valid rate', () => {
    const result = signalToPursuitConversion()
    expect(result.passed).toBeGreaterThan(0)
    expect(result.converted).toBeGreaterThanOrEqual(0)
    expect(result.rate).toBeGreaterThanOrEqual(0)
    expect(result.rate).toBeLessThanOrEqual(1)
  })

  it('estimateReadyCycleTime returns non-negative median', () => {
    const result = estimateReadyCycleTime()
    expect(result.median_days).toBeGreaterThanOrEqual(0)
  })

  it('proposalAgingByBucket returns valid buckets', () => {
    const result = proposalAgingByBucket()
    expect(result.total).toBeGreaterThanOrEqual(0)
    expect(result['0-7'] + result['8-14'] + result['15-30'] + result['30+']).toBe(result.total)
  })

  it('winRate returns valid rate from seed data', () => {
    const result = winRate()
    expect(result.rate).toBeGreaterThanOrEqual(0)
    expect(result.rate).toBeLessThanOrEqual(1)
    // Seed has 1 accepted proposal
    expect(result.accepted).toBeGreaterThanOrEqual(1)
  })

  it('lossReasonDistribution returns array', () => {
    const result = lossReasonDistribution()
    expect(Array.isArray(result)).toBe(true)
  })

  it('nextActionHygiene returns rate between 0 and 1', () => {
    const result = nextActionHygiene()
    expect(result.rate).toBeGreaterThanOrEqual(0)
    expect(result.rate).toBeLessThanOrEqual(1)
    expect(result.total).toBeGreaterThan(0)
  })
})

describe('KPI Engine — PM/Ops KPIs', () => {
  beforeEach(() => {
    resetDb()
    seedAll()
  })

  it('jobsAwaitingPMClaim returns non-negative count', () => {
    const count = jobsAwaitingPMClaim()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  it('readinessPassRate returns valid rate', () => {
    const result = readinessPassRate()
    expect(result.rate).toBeGreaterThanOrEqual(0)
    expect(result.rate).toBeLessThanOrEqual(1)
  })

  it('callbackRate returns valid rate', () => {
    const result = callbackRate()
    expect(result.rate).toBeGreaterThanOrEqual(0)
  })

  it('invoiceReleaseSpeed returns non-negative median', () => {
    const result = invoiceReleaseSpeed()
    expect(result.median_days).toBeGreaterThanOrEqual(0)
  })

  it('arAgingByClient returns array (stub)', () => {
    const result = arAgingByClient()
    expect(Array.isArray(result)).toBe(true)
  })

  it('pmReviewClosureRate returns stub result', () => {
    const result = pmReviewClosureRate()
    expect(result.rate).toBe(0)
  })
})

describe('KPI Engine — Pipeline / Dashboard', () => {
  beforeEach(() => {
    resetDb()
    seedAll()
  })

  it('pipelineValueByStage returns 5 stages', () => {
    const result = pipelineValueByStage()
    expect(result).toHaveLength(5)
    expect(result[0]!.stage).toBe('Pursuits in Qualification')
  })

  it('activeAlerts returns array of alerts', () => {
    const alerts = activeAlerts()
    expect(Array.isArray(alerts)).toBe(true)
    // Seed data should have some overdue items since dates are in the past
  })

  it('recentActivity returns audit entries', () => {
    const activity = recentActivity(5)
    expect(Array.isArray(activity)).toBe(true)
    expect(activity.length).toBeLessThanOrEqual(5)
  })
})
