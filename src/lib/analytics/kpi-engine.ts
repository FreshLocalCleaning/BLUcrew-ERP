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

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
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
  const active = proposals.filter((p) => ['delivered', 'in_review', 'hold'].includes(p.status))
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
export function winRate(): { rate: number; accepted: number; rejected: number; hasData: boolean } {
  const proposals = db.list<Proposal>('proposals')
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const recent = proposals.filter((p) => p.updated_at >= cutoff)
  const accepted = recent.filter((p) => p.status === 'accepted').length
  const rejected = recent.filter((p) => p.status === 'rejected').length
  const total = accepted + rejected
  return { rate: total > 0 ? accepted / total : 0, accepted, rejected, hasData: total > 0 }
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

/** Contact coverage: client breakdown by tier */
export function clientTierBreakdown(): { A: number; B: number; C: number; unset: number } {
  const clients = db.list<Client>('clients')
  const result = { A: 0, B: 0, C: 0, unset: 0 }
  for (const c of clients) {
    if (c.tier === 'A') result.A++
    else if (c.tier === 'B') result.B++
    else if (c.tier === 'C') result.C++
    else result.unset++
  }
  return result
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
  const advanced = mobs.filter((m) =>
    ['ready', 'in_field', 'complete'].includes(m.status),
  )
  const firstAttempt = advanced.filter((m) => !m.blocker_reason)
  return {
    rate: advanced.length > 0 ? firstAttempt.length / advanced.length : 0,
    first_attempt: firstAttempt.length,
    total: advanced.length,
  }
}

/** Operations health snapshot */
export function opsHealthSnapshot(): {
  projectsByStatus: Record<string, number>
  totalProjects: number
  mobsThisMonth: number
  mobsByState: Record<string, number>
  coByStatus: Record<string, number>
  totalCOs: number
  financiallyOpen: number
  financiallyOpenDays: number
} {
  const projects = db.list<Project>('projects')
  const mobs = db.list<Mobilization>('mobilizations')
  const cos = db.list<ChangeOrder>('change_orders')
  const today = todayStr()

  // Projects by status
  const projectsByStatus: Record<string, number> = {}
  for (const p of projects) {
    projectsByStatus[p.status] = (projectsByStatus[p.status] ?? 0) + 1
  }

  // Mobs this month
  const monthStart = today.slice(0, 7) // YYYY-MM
  const mobsThisMonth = mobs.filter((m) =>
    m.requested_start_date && m.requested_start_date.startsWith(monthStart),
  ).length

  // Mobs by state
  const mobsByState: Record<string, number> = {}
  for (const m of mobs) {
    mobsByState[m.status] = (mobsByState[m.status] ?? 0) + 1
  }

  // COs by status
  const coByStatus: Record<string, number> = {}
  for (const co of cos) {
    coByStatus[co.status] = (coByStatus[co.status] ?? 0) + 1
  }

  // Financially open projects
  const foProjects = projects.filter((p) => p.status === 'financially_open')
  let foDays = 0
  for (const p of foProjects) {
    foDays += daysBetween(p.updated_at, new Date().toISOString())
  }

  return {
    projectsByStatus,
    totalProjects: projects.length,
    mobsThisMonth,
    mobsByState,
    coByStatus,
    totalCOs: cos.length,
    financiallyOpen: foProjects.length,
    financiallyOpenDays: foDays,
  }
}

// ---------------------------------------------------------------------------
// Pipeline / Dashboard aggregates
// ---------------------------------------------------------------------------

export interface PipelineStage {
  stage: string
  label: string
  count: number
  value: number
  href: string
}

/** Pipeline value by stage — for dashboard funnel chart */
export function pipelineValueByStage(): PipelineStage[] {
  const signals = db.list<Record<string, unknown> & db.BaseEntity>('project_signals')
  const pursuits = db.list<Pursuit>('pursuits')
  const estimates = db.list<Estimate>('estimates')
  const proposals = db.list<Proposal>('proposals')
  const awards = db.list<AwardHandoff>('award_handoffs')
  const projects = db.list<Project>('projects')
  const mobs = db.list<Mobilization>('mobilizations')

  const activeSignals = signals.filter((s) => s['status'] === 'under_review')
  const activePursuits = pursuits.filter((p) =>
    !['estimate_ready', 'no_bid', 'dormant', 'hold'].includes(p.stage),
  )
  const estInBuild = estimates.filter((e) => ['draft', 'in_build', 'qa_review'].includes(e.status))
  const activeProposals = proposals.filter((p) => ['delivered', 'in_review', 'hold'].includes(p.status))
  const activeAwards = awards.filter((a) =>
    ['awarded_intake_open', 'compliance_in_progress', 'handoff_posted', 'pm_claimed'].includes(a.status),
  )
  const activeProjects = projects.filter((p) =>
    ['startup_pending', 'forecasting_active', 'execution_active'].includes(p.status),
  )
  const inFieldMobs = mobs.filter((m) => m.status === 'in_field')

  return [
    { stage: 'signals', label: 'Signals', count: activeSignals.length, value: 0, href: '/project-signals' },
    { stage: 'pursuits', label: 'Pursuits', count: activePursuits.length, value: 0, href: '/pursuits' },
    { stage: 'estimates', label: 'Estimates', count: estInBuild.length, value: 0, href: '/estimates' },
    {
      stage: 'proposals', label: 'Proposals', count: activeProposals.length,
      value: activeProposals.reduce((sum, p) => sum + (p.proposal_value ?? 0), 0),
      href: '/proposals',
    },
    { stage: 'awards', label: 'Awards', count: activeAwards.length, value: 0, href: '/handoffs' },
    { stage: 'projects', label: 'Projects', count: activeProjects.length, value: 0, href: '/projects' },
    { stage: 'mobilizations', label: 'In Field', count: inFieldMobs.length, value: 0, href: '/mobilizations' },
  ]
}

// ---------------------------------------------------------------------------
// Action Items (replaces alerts — comprehensive task queue)
// ---------------------------------------------------------------------------

export type ActionCategory = 'contact_followups' | 'pipeline' | 'commercial' | 'operations' | 'growth'

export interface ActionItem {
  type: string
  priority: number // lower = more urgent
  category: ActionCategory
  entity_type: string
  entity_id: string
  ref_id: string
  name: string
  message: string
  days_overdue?: number
  days_until?: number
  href: string
  /** Extra context for contact follow-ups */
  contact_owner?: string
  client_name?: string
}

const ENTITY_ROUTES: Record<string, string> = {
  clients: '/clients',
  contacts: '/contacts',
  project_signals: '/project-signals',
  pursuits: '/pursuits',
  estimates: '/estimates',
  proposals: '/proposals',
  award_handoffs: '/handoffs',
  projects: '/projects',
  mobilizations: '/mobilizations',
  change_orders: '/change-orders',
  expansion_tasks: '/growth',
}

function entityHref(col: string, id: string): string {
  return `${ENTITY_ROUTES[col] ?? ''}/${id}`
}

const CATEGORY_MAP: Record<string, ActionCategory> = {
  contacts: 'contact_followups',
  clients: 'pipeline',
  project_signals: 'pipeline',
  pursuits: 'pipeline',
  estimates: 'commercial',
  proposals: 'commercial',
  award_handoffs: 'commercial',
  projects: 'operations',
  mobilizations: 'operations',
  change_orders: 'operations',
  expansion_tasks: 'growth',
}

/** Resolve a human-readable display name for an entity record */
function resolveEntityName(col: string, e: Record<string, unknown>): string {
  switch (col) {
    case 'clients':
      return String(e['name'] ?? e['reference_id'] ?? '')
    case 'contacts': {
      const full = `${e['first_name'] ?? ''} ${e['last_name'] ?? ''}`.trim()
      return e['client_name'] ? `${full} — ${e['client_name']}` : full
    }
    case 'pursuits':
    case 'estimates':
    case 'proposals':
    case 'award_handoffs':
    case 'projects':
      return String(e['project_name'] ?? e['reference_id'] ?? '')
    case 'project_signals':
      return String(e['project_identity'] ?? e['reference_id'] ?? '')
    case 'mobilizations':
      return String(e['stage_name'] ?? e['reference_id'] ?? '')
    case 'change_orders': {
      const scope = String(e['scope_delta'] ?? '')
      return scope.length > 50 ? scope.slice(0, 50) + '...' : scope || String(e['reference_id'] ?? '')
    }
    case 'expansion_tasks': {
      const obj = String(e['growth_objective'] ?? '')
      return obj.length > 50 ? obj.slice(0, 50) + '...' : obj || String(e['reference_id'] ?? '')
    }
    default:
      return String(e['name'] ?? e['reference_id'] ?? '')
  }
}

/** Build comprehensive action items list sorted by urgency */
export function actionItems(): ActionItem[] {
  const items: ActionItem[] = []
  const today = todayStr()
  const todayMs = new Date(today).getTime()
  const sevenDays = new Date(todayMs + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!
  const staleThreshold = new Date(todayMs - 7 * 24 * 60 * 60 * 1000).toISOString()
  const proposalStaleThreshold = new Date(todayMs - 14 * 24 * 60 * 60 * 1000).toISOString()

  // --- Overdue + upcoming next actions across all entities ---
  const collections: db.EntityCollectionName[] = [
    'clients', 'contacts', 'pursuits', 'estimates', 'proposals',
    'award_handoffs', 'projects', 'mobilizations', 'change_orders',
    'expansion_tasks',
  ]
  for (const col of collections) {
    const entities = db.list<db.BaseEntity & Record<string, unknown>>(col)
    for (const e of entities) {
      const refId = String(e['reference_id'] ?? e.id.slice(0, 8))
      const name = resolveEntityName(col, e)
      const category = CATEGORY_MAP[col] ?? 'pipeline'
      if (e.next_action_date) {
        if (e.next_action_date < today) {
          const overdue = daysBetween(e.next_action_date, today)
          items.push({
            type: 'overdue',
            priority: 10 - Math.min(overdue, 10),
            category,
            entity_type: col,
            entity_id: e.id,
            ref_id: refId,
            name,
            message: e.next_action ?? 'No action specified',
            days_overdue: overdue,
            href: entityHref(col, e.id),
            ...(col === 'contacts' ? { contact_owner: String(e['owner_name'] ?? ''), client_name: String(e['client_name'] ?? '') } : {}),
          })
        } else if (e.next_action_date <= sevenDays!) {
          const daysUntil = daysBetween(today, e.next_action_date)
          items.push({
            type: 'upcoming',
            priority: 30 + daysUntil,
            category,
            entity_type: col,
            entity_id: e.id,
            ref_id: refId,
            name,
            message: e.next_action ?? 'Action due',
            days_until: daysUntil,
            href: entityHref(col, e.id),
            ...(col === 'contacts' ? { contact_owner: String(e['owner_name'] ?? ''), client_name: String(e['client_name'] ?? '') } : {}),
          })
        }
      }
    }
  }

  // --- Contact follow-ups from touch log (next_step_due_date) ---
  const contacts = db.list<Contact>('contacts')
  for (const c of contacts) {
    if (!c.next_step_due_date) continue
    // Skip if already captured via next_action_date
    if (c.next_action_date === c.next_step_due_date) continue
    const contactName = `${c.first_name} ${c.last_name}` + (c.client_name ? ` — ${c.client_name}` : '')
    if (c.next_step_due_date < today) {
      const overdue = daysBetween(c.next_step_due_date, today)
      items.push({
        type: 'overdue',
        priority: 10 - Math.min(overdue, 10),
        category: 'contact_followups',
        entity_type: 'contacts',
        entity_id: c.id,
        ref_id: c.reference_id,
        name: contactName,
        message: c.next_step ?? 'Follow-up due',
        days_overdue: overdue,
        href: `/contacts/${c.id}`,
        contact_owner: c.owner_name ?? '',
        client_name: c.client_name,
      })
    } else if (c.next_step_due_date <= sevenDays!) {
      const daysUntil = daysBetween(today, c.next_step_due_date)
      items.push({
        type: 'upcoming',
        priority: 30 + daysUntil,
        category: 'contact_followups',
        entity_type: 'contacts',
        entity_id: c.id,
        ref_id: c.reference_id,
        name: contactName,
        message: c.next_step ?? 'Follow-up due',
        days_until: daysUntil,
        href: `/contacts/${c.id}`,
        contact_owner: c.owner_name ?? '',
        client_name: c.client_name,
      })
    }
  }

  // --- Pursuits stuck in same stage 7+ days ---
  const pursuits = db.list<Pursuit>('pursuits')
  for (const p of pursuits) {
    if (!['estimate_ready', 'no_bid', 'dormant', 'hold'].includes(p.stage) && p.updated_at < staleThreshold) {
      items.push({
        type: 'stalled_pursuit',
        priority: 20,
        category: 'pipeline',
        entity_type: 'pursuits',
        entity_id: p.id,
        ref_id: p.reference_id,
        name: p.project_name,
        message: `Stuck at ${p.stage.replace(/_/g, ' ')} for ${daysBetween(p.updated_at, new Date().toISOString())}d`,
        href: `/pursuits/${p.id}`,
      })
    }
  }

  // --- Estimates awaiting QA ---
  const estimates = db.list<Estimate>('estimates')
  for (const e of estimates) {
    if (e.status === 'qa_review') {
      items.push({
        type: 'estimate_qa',
        priority: 22,
        category: 'commercial',
        entity_type: 'estimates',
        entity_id: e.id,
        ref_id: e.reference_id,
        name: e.project_name,
        message: 'Awaiting QA review',
        href: `/estimates/${e.id}`,
      })
    }
  }

  // --- COs needing pricing ---
  const cos = db.list<ChangeOrder>('change_orders')
  for (const co of cos) {
    if (co.status === 'internal_review' && !co.pricing_delta) {
      items.push({
        type: 'co_needs_pricing',
        priority: 18,
        category: 'operations',
        entity_type: 'change_orders',
        entity_id: co.id,
        ref_id: co.reference_id,
        name: co.scope_delta.length > 50 ? co.scope_delta.slice(0, 50) + '...' : co.scope_delta,
        message: 'Needs pricing from Estimating',
        href: `/change-orders/${co.id}`,
      })
    }
  }

  // --- Proposals awaiting decision 14+ days ---
  const proposals = db.list<Proposal>('proposals')
  for (const p of proposals) {
    if (['delivered', 'in_review'].includes(p.status) && p.updated_at < proposalStaleThreshold) {
      items.push({
        type: 'proposal_stale',
        priority: 25,
        category: 'commercial',
        entity_type: 'proposals',
        entity_id: p.id,
        ref_id: p.reference_id,
        name: p.project_name ?? p.reference_id,
        message: `Awaiting decision for ${daysBetween(p.delivery_date ?? p.created_at, new Date().toISOString())}d`,
        href: `/proposals/${p.id}`,
      })
    }
  }

  // --- Handoffs awaiting PM claim ---
  const awards = db.list<AwardHandoff>('award_handoffs')
  for (const a of awards) {
    if (a.status === 'handoff_posted') {
      items.push({
        type: 'awaiting_pm_claim',
        priority: 15,
        category: 'commercial',
        entity_type: 'award_handoffs',
        entity_id: a.id,
        ref_id: a.reference_id,
        name: a.project_name,
        message: 'Handoff posted — needs PM claim',
        href: `/handoffs/${a.id}`,
      })
    }
  }

  // --- Blocked mobilizations ---
  const mobs = db.list<Mobilization>('mobilizations')
  for (const m of mobs) {
    if (m.status === 'blocked') {
      items.push({
        type: 'blocked_mob',
        priority: 12,
        category: 'operations',
        entity_type: 'mobilizations',
        entity_id: m.id,
        ref_id: m.reference_id,
        name: m.stage_name,
        message: `Blocked: ${m.blocker_reason ?? 'Unknown'}`,
        href: `/mobilizations/${m.id}`,
      })
    }
  }

  // --- Projects at operationally_complete (PM-15 reviews due) ---
  const projects = db.list<Project>('projects')
  for (const p of projects) {
    if (p.status === 'operationally_complete') {
      items.push({
        type: 'pm15_review',
        priority: 28,
        category: 'operations',
        entity_type: 'projects',
        entity_id: p.id,
        ref_id: p.reference_id,
        name: p.project_name,
        message: 'PM-15 review due — operationally complete',
        href: `/projects/${p.id}`,
      })
    }
    if (p.status === 'financially_open') {
      items.push({
        type: 'invoice_pending',
        priority: 26,
        category: 'operations',
        entity_type: 'projects',
        entity_id: p.id,
        ref_id: p.reference_id,
        name: p.project_name,
        message: 'Invoices pending release — financially open',
        href: `/projects/${p.id}`,
      })
    }
  }

  // Sort by priority (lower = more urgent)
  items.sort((a, b) => a.priority - b.priority)
  return items
}

// ---------------------------------------------------------------------------
// Recent Activity (enriched)
// ---------------------------------------------------------------------------

export interface EnrichedActivity {
  id: string
  action: string
  entity_type: string
  entity_id: string
  description: string
  timestamp: string
  actor_id: string
  href: string
  date_group: 'today' | 'yesterday' | 'this_week' | 'older'
}

export function enrichedRecentActivity(limit: number = 20): EnrichedActivity[] {
  const fs = require('fs')
  const path = require('path')
  const dbPath = path.join(process.cwd(), '.data', 'workflow-db.json')
  if (!fs.existsSync(dbPath)) return []
  const raw = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
  const entries = (raw.audit_log ?? []) as db.AuditEntry[]

  // Build entity name cache with human-readable names
  const nameCache = new Map<string, string>()
  const refIdCache = new Map<string, string>()
  const allCollections = raw as Record<string, Record<string, Record<string, unknown>>>
  for (const col of Object.keys(allCollections)) {
    if (col === 'audit_log' || col === 'integration_events') continue
    const records = allCollections[col]
    if (typeof records === 'object' && records !== null && !Array.isArray(records)) {
      for (const [id, record] of Object.entries(records)) {
        const refId = String(record['reference_id'] ?? '')
        refIdCache.set(id, refId)
        const resolvedName = resolveEntityName(col, record)
        const displayName = resolvedName
          ? (refId ? `${resolvedName} (${refId})` : resolvedName)
          : (refId || id.slice(0, 8))
        nameCache.set(id, displayName.slice(0, 80))
      }
    }
  }

  const now = new Date()
  const todayDate = now.toISOString().split('T')[0]
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const ENTITY_LABELS: Record<string, string> = {
    clients: 'client',
    contacts: 'contact',
    project_signals: 'signal',
    pursuits: 'pursuit',
    estimates: 'estimate',
    proposals: 'proposal',
    award_handoffs: 'handoff',
    projects: 'project',
    mobilizations: 'mobilization',
    change_orders: 'change order',
    expansion_tasks: 'growth task',
    equipment_templates: 'equipment template',
  }

  return entries.slice(-limit).reverse().map((entry) => {
    const entityName = nameCache.get(entry.entity_id) ?? entry.entity_id.slice(0, 8)
    const entityLabel = ENTITY_LABELS[entry.entity_type] ?? entry.entity_type
    const verb = entry.action === 'create' ? 'created' : entry.action === 'update' ? 'updated' : entry.action === 'delete' ? 'archived' : entry.action
    const entryDate = entry.timestamp.split('T')[0]!

    let dateGroup: EnrichedActivity['date_group'] = 'older'
    if (entryDate === todayDate) dateGroup = 'today'
    else if (entryDate === yesterday) dateGroup = 'yesterday'
    else if (entryDate! >= weekAgo!) dateGroup = 'this_week'

    let description = `${entry.actor_id} ${verb} ${entityLabel} "${entityName}"`
    if (entry.reason) {
      description += ` — ${entry.reason}`
    } else if (entry.action === 'update' && Object.keys(entry.field_changes).length > 0) {
      const fields = Object.keys(entry.field_changes).slice(0, 3).join(', ')
      description += ` (${fields})`
    }

    return {
      id: entry.id,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      description,
      timestamp: entry.timestamp,
      actor_id: entry.actor_id,
      href: entityHref(entry.entity_type, entry.entity_id),
      date_group: dateGroup,
    }
  })
}

// ---------------------------------------------------------------------------
// PM KPIs (kept for tests)
// ---------------------------------------------------------------------------

/** Callback rate: mobilizations requiring return visit / total completed */
export function callbackRate(): { rate: number; callbacks: number; completed: number } {
  const mobs = db.list<Mobilization>('mobilizations')
  const completed = mobs.filter((m) => m.status === 'complete')
  const callbacks = completed.filter((m) => /callback|return|punch/i.test(m.stage_name))
  return {
    rate: completed.length > 0 ? callbacks.length / completed.length : 0,
    callbacks: callbacks.length,
    completed: completed.length,
  }
}

/** Invoice release speed: median days from mobilization complete to invoice released */
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

/** AR aging by client — stub */
export function arAgingByClient(): { client_id: string; '0-30': number; '31-60': number; '61-90': number; '90+': number }[] {
  return []
}

/** PM-15 review closure rate — stub */
export function pmReviewClosureRate(): { rate: number; closed: number; total: number } {
  return { rate: 0, closed: 0, total: 0 }
}

// ---------------------------------------------------------------------------
// Contact Follow-up KPI
// ---------------------------------------------------------------------------

export interface ContactFollowupCounts {
  overdue: number
  today: number
  thisWeek: number
  total: number
}

/** Count contact follow-ups by urgency bucket */
export function contactFollowupCounts(): ContactFollowupCounts {
  const allContacts = db.list<Contact>('contacts')
  const now = new Date()
  const todayDate = now.toISOString().split('T')[0]!
  const todayMs = new Date(todayDate).getTime()
  const weekEnd = new Date(todayMs + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!

  let overdue = 0
  let todayCount = 0
  let thisWeek = 0

  for (const c of allContacts) {
    const dueDate = c.next_step_due_date ?? c.next_action_date
    if (!dueDate) continue
    const dateOnly = dueDate.split('T')[0]!
    if (dateOnly < todayDate) {
      overdue++
    } else if (dateOnly === todayDate) {
      todayCount++
    } else if (dateOnly <= weekEnd) {
      thisWeek++
    }
  }
  return { overdue, today: todayCount, thisWeek, total: overdue + todayCount + thisWeek }
}

// ---------------------------------------------------------------------------
// Legacy exports (kept for backward compat in tests)
// ---------------------------------------------------------------------------

export type Alert = ActionItem
export function activeAlerts(): ActionItem[] { return actionItems() }
export function recentActivity(limit: number = 10): db.AuditEntry[] {
  const fs = require('fs')
  const path = require('path')
  const dbPath = path.join(process.cwd(), '.data', 'workflow-db.json')
  if (!fs.existsSync(dbPath)) return []
  const raw = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
  return ((raw.audit_log ?? []) as db.AuditEntry[]).slice(-limit).reverse()
}
