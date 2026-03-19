/**
 * KPI Calculation Engine (ERP-21)
 *
 * Pure calculations from JSON DB collections.
 * Each function reads directly from the DB and returns a typed result.
 */

import * as db from '@/lib/db/json-db'
import type { Client, Contact, Pursuit, Estimate, Proposal, AwardHandoff, Project, Mobilization, ChangeOrder, ExpansionTask } from '@/types/commercial'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(a: string, b: string): number {
  return Math.floor(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24),
  )
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]!
}

// ---------------------------------------------------------------------------
// Commercial KPIs
// ---------------------------------------------------------------------------

/** Signal-to-pursuit conversion: passed signals that became pursuits / total passed signals */
export function signalToPursuitConversion(): { rate: number; passed: number; converted: number } {
  const signals = db.list<Record<string, unknown> & db.BaseEntity>('project_signals')
  const passed = signals.filter((s) => s['gate_outcome'] === 'passed')
  const converted = passed.filter((s) => s['created_pursuit_id'])
  return {
    rate: passed.length > 0 ? converted.length / passed.length : 0,
    passed: passed.length,
    converted: converted.length,
  }
}

/** Estimate Ready cycle time: median days from pursuit creation to estimate_ready */
export function estimateReadyCycleTime(): { median_days: number; sample_count: number } {
  const pursuits = db.list<Pursuit>('pursuits')
  const durations: number[] = []
  for (const p of pursuits) {
    if (p.stage === 'estimate_ready') {
      durations.push(daysBetween(p.created_at, p.updated_at))
    }
  }
  return { median_days: median(durations), sample_count: durations.length }
}

/** Proposal aging by bucket: count of active proposals grouped by age */
export function proposalAgingByBucket(): { '0-7': number; '8-14': number; '15-30': number; '30+': number; total: number } {
  const proposals = db.list<Proposal>('proposals')
  const active = proposals.filter((p) => ['delivered', 'in_review'].includes(p.status))
  const today = todayStr()
  const buckets = { '0-7': 0, '8-14': 0, '15-30': 0, '30+': 0, total: active.length }

  for (const p of active) {
    const age = daysBetween(p.delivery_date ?? p.created_at, today)
    if (age <= 7) buckets['0-7']++
    else if (age <= 14) buckets['8-14']++
    else if (age <= 30) buckets['15-30']++
    else buckets['30+']++
  }
  return buckets
}

/** Win rate: accepted / (accepted + rejected) over rolling 90 days */
export function winRate(): { rate: number; accepted: number; rejected: number } {
  const proposals = db.list<Proposal>('proposals')
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const recent = proposals.filter((p) => p.updated_at >= cutoff)
  const accepted = recent.filter((p) => p.status === 'accepted').length
  const rejected = recent.filter((p) => p.status === 'rejected').length
  const total = accepted + rejected
  return { rate: total > 0 ? accepted / total : 0, accepted, rejected }
}

/** Loss reason distribution: top rejection reasons by count */
export function lossReasonDistribution(): { reason: string; count: number }[] {
  const proposals = db.list<Proposal>('proposals')
  const rejected = proposals.filter((p) => p.status === 'rejected' && p.accepted_rejected_reason)
  const counts = new Map<string, number>()
  for (const p of rejected) {
    const reason = String(p.accepted_rejected_reason)
    counts.set(reason, (counts.get(reason) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

/** Next-action hygiene: % of active records with owner + next_action + next_action_date */
export function nextActionHygiene(): { rate: number; compliant: number; total: number } {
  const collections: db.EntityCollectionName[] = [
    'clients', 'contacts', 'pursuits', 'estimates', 'proposals',
    'award_handoffs', 'projects', 'mobilizations', 'change_orders', 'expansion_tasks',
  ]
  let total = 0
  let compliant = 0
  for (const col of collections) {
    const entities = db.list<db.BaseEntity>(col)
    for (const e of entities) {
      total++
      if (e.owner && e.next_action && e.next_action_date) {
        compliant++
      }
    }
  }
  return { rate: total > 0 ? compliant / total : 0, compliant, total }
}

// ---------------------------------------------------------------------------
// PM / Operations KPIs
// ---------------------------------------------------------------------------

/** Jobs awaiting PM claim: count of award_handoffs at handoff_posted not yet claimed */
export function jobsAwaitingPMClaim(): number {
  const awards = db.list<AwardHandoff>('award_handoffs')
  return awards.filter((a) => a.status === 'handoff_posted').length
}

/** Readiness pass rate: mobilizations reaching ready on first attempt / total mobilizations */
export function readinessPassRate(): { rate: number; first_attempt: number; total: number } {
  const mobs = db.list<Mobilization>('mobilizations')
  // Count mobs that are/were in ready, in_field, or complete
  const advanced = mobs.filter((m) =>
    ['ready', 'in_field', 'complete'].includes(m.status),
  )
  // First attempt = never went through blocked state (heuristic: blocker_reason is null)
  const firstAttempt = advanced.filter((m) => !m.blocker_reason)
  return {
    rate: advanced.length > 0 ? firstAttempt.length / advanced.length : 0,
    first_attempt: firstAttempt.length,
    total: advanced.length,
  }
}

/** Callback rate: mobilizations requiring return visit / total completed */
export function callbackRate(): { rate: number; callbacks: number; completed: number } {
  const mobs = db.list<Mobilization>('mobilizations')
  const completed = mobs.filter((m) => m.status === 'complete')
  // Heuristic: if a project has >1 completed mobilization, additional ones may be callbacks
  // For now, count mobilizations with "callback" or "return" in stage_name
  const callbacks = completed.filter((m) =>
    /callback|return|punch/i.test(m.stage_name),
  )
  return {
    rate: completed.length > 0 ? callbacks.length / completed.length : 0,
    callbacks: callbacks.length,
    completed: completed.length,
  }
}

/** Invoice release speed: median days from mobilization complete to invoice_release_status = released */
export function invoiceReleaseSpeed(): { median_days: number; sample_count: number } {
  const mobs = db.list<Mobilization>('mobilizations')
  const durations: number[] = []
  for (const m of mobs) {
    if (m.status === 'complete' && m.invoice_release_status === 'released' && m.actual_end_date) {
      durations.push(daysBetween(m.actual_end_date, m.updated_at))
    }
  }
  return { median_days: median(durations), sample_count: durations.length }
}

/** AR aging by client: outstanding amounts grouped by age buckets */
export function arAgingByClient(): { client_id: string; '0-30': number; '31-60': number; '61-90': number; '90+': number }[] {
  // Stub — no real invoicing system yet. Returns empty.
  return []
}

/** PM-15 review closure rate: completed reviews within 14 days / total triggered */
export function pmReviewClosureRate(): { rate: number; closed: number; total: number } {
  // Stub — PM-15 reviews not yet implemented. Returns 0%.
  return { rate: 0, closed: 0, total: 0 }
}

// ---------------------------------------------------------------------------
// Pipeline / Dashboard aggregates
// ---------------------------------------------------------------------------

export interface PipelineStage {
  stage: string
  count: number
  value: number
}

/** Pipeline value by stage — for dashboard chart */
export function pipelineValueByStage(): PipelineStage[] {
  const pursuits = db.list<Pursuit>('pursuits')
  const estimates = db.list<Estimate>('estimates')
  const proposals = db.list<Proposal>('proposals')
  const awards = db.list<AwardHandoff>('award_handoffs')
  const projects = db.list<Project>('projects')

  const qualPursuits = pursuits.filter((p) =>
    ['qualification_underway', 'qualified_pursuit', 'preconstruction_packet_open', 'site_walk_scheduled', 'site_walk_complete'].includes(p.stage),
  )
  const estInBuild = estimates.filter((e) => ['draft', 'in_build', 'qa_review'].includes(e.status))
  const activeProposals = proposals.filter((p) => ['delivered', 'in_review'].includes(p.status))
  const activeAwards = awards.filter((a) =>
    ['awarded_intake_open', 'compliance_in_progress', 'handoff_posted', 'pm_claimed'].includes(a.status),
  )
  const execProjects = projects.filter((p) =>
    ['forecasting_active', 'execution_active'].includes(p.status),
  )

  return [
    { stage: 'Pursuits in Qualification', count: qualPursuits.length, value: 0 },
    { stage: 'Estimates in Build/QA', count: estInBuild.length, value: 0 },
    {
      stage: 'Proposals Delivered',
      count: activeProposals.length,
      value: activeProposals.reduce((sum, p) => sum + (p.proposal_value ?? 0), 0),
    },
    { stage: 'Awards in Compliance/Handoff', count: activeAwards.length, value: 0 },
    { stage: 'Projects in Execution', count: execProjects.length, value: 0 },
  ]
}

/** Active alerts: overdue next actions, stalled pursuits, blocked mobs, etc. */
export interface Alert {
  type: string
  entity_type: string
  entity_id: string
  ref_id: string
  message: string
}

export function activeAlerts(): Alert[] {
  const alerts: Alert[] = []
  const today = todayStr()

  // Overdue next actions across entities
  const collections: db.EntityCollectionName[] = [
    'clients', 'pursuits', 'estimates', 'proposals',
    'award_handoffs', 'projects', 'mobilizations', 'change_orders',
  ]
  for (const col of collections) {
    const entities = db.list<db.BaseEntity & Record<string, unknown>>(col)
    for (const e of entities) {
      if (e.next_action_date && e.next_action_date < today) {
        alerts.push({
          type: 'overdue_next_action',
          entity_type: col,
          entity_id: e.id,
          ref_id: String(e['reference_id'] ?? e.id.slice(0, 8)),
          message: `Overdue: ${e.next_action ?? 'No action specified'} (due ${e.next_action_date})`,
        })
      }
    }
  }

  // Blocked mobilizations
  const mobs = db.list<Mobilization>('mobilizations')
  for (const m of mobs) {
    if (m.status === 'blocked') {
      alerts.push({
        type: 'blocked_mobilization',
        entity_type: 'mobilizations',
        entity_id: m.id,
        ref_id: m.reference_id,
        message: `Blocked: ${m.blocker_reason ?? 'Unknown reason'}`,
      })
    }
  }

  // Change orders awaiting estimating (internal_review = needs pricing)
  const changeOrders = db.list<ChangeOrder>('change_orders')
  for (const co of changeOrders) {
    if (co.status === 'internal_review' && !co.pricing_delta) {
      alerts.push({
        type: 'co_needs_pricing',
        entity_type: 'change_orders',
        entity_id: co.id,
        ref_id: co.reference_id,
        message: `Needs pricing: ${co.scope_delta.length > 60 ? co.scope_delta.slice(0, 60) + '…' : co.scope_delta}`,
      })
    }
  }

  // Stalled pursuits (no update in 14+ days)
  const pursuits = db.list<Pursuit>('pursuits')
  const staleDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  for (const p of pursuits) {
    if (!['estimate_ready', 'no_bid', 'dormant', 'hold'].includes(p.stage) && p.updated_at < staleDate) {
      alerts.push({
        type: 'stalled_pursuit',
        entity_type: 'pursuits',
        entity_id: p.id,
        ref_id: p.reference_id,
        message: `Stalled: no activity since ${p.updated_at.split('T')[0]}`,
      })
    }
  }

  return alerts
}

/** Recent activity: last N audit log entries across all entities */
export function recentActivity(limit: number = 10): db.AuditEntry[] {
  const allDb = db.list<db.BaseEntity>('clients') // dummy call to trigger readDb
  // We need raw access to audit_log
  const events = (() => {
    // Read audit log directly
    const fs = require('fs')
    const path = require('path')
    const dbPath = path.join(process.cwd(), '.data', 'workflow-db.json')
    if (!fs.existsSync(dbPath)) return []
    const raw = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    return (raw.audit_log ?? []) as db.AuditEntry[]
  })()

  return events.slice(-limit).reverse()
}
