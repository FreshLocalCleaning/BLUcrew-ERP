import { ReportsDashboard } from '@/components/reports/reports-dashboard'
import * as db from '@/lib/db/json-db'
import { lossReasonDistribution, nextActionHygiene } from '@/lib/analytics/kpi-engine'
import type { Pursuit, Proposal, ExpansionTask } from '@/types/commercial'
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

function computeStageAging() {
  const pursuits = db.list<Pursuit>('pursuits')
  const stageMap = new Map<string, number[]>()
  const today = new Date()

  for (const p of pursuits) {
    const days = Math.floor(
      (today.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24),
    )
    const existing = stageMap.get(p.stage) ?? []
    existing.push(days)
    stageMap.set(p.stage, existing)
  }

  return [...stageMap.entries()].map(([stage, days]) => ({
    stage: stage.replace(/_/g, ' '),
    avg_days: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
    count: days.length,
  }))
}

function computeProposalOutcomes() {
  const proposals = db.list<Proposal>('proposals')
  const outcomes = [
    { name: 'Accepted', value: proposals.filter((p) => p.status === 'accepted').length },
    { name: 'Rejected', value: proposals.filter((p) => p.status === 'rejected').length },
    { name: 'Dormant', value: proposals.filter((p) => p.status === 'dormant').length },
    { name: 'Active', value: proposals.filter((p) => ['delivered', 'in_review', 'hold'].includes(p.status)).length },
  ].filter((o) => o.value > 0)
  return outcomes
}

function computeExpansionSummary() {
  const tasks = db.list<ExpansionTask>('expansion_tasks')
  const statusMap = new Map<string, number>()
  for (const t of tasks) {
    statusMap.set(t.status, (statusMap.get(t.status) ?? 0) + 1)
  }
  return [...statusMap.entries()].map(([status, count]) => ({ status, count }))
}

function computeHygieneByEntity() {
  const collections: db.EntityCollectionName[] = [
    'clients', 'contacts', 'pursuits', 'estimates', 'proposals',
    'projects', 'mobilizations', 'change_orders',
  ]
  return collections.map((col) => {
    const entities = db.list<db.BaseEntity>(col)
    const compliant = entities.filter((e) => e.owner && e.next_action && e.next_action_date).length
    return {
      entity: col.replace(/_/g, ' '),
      rate: entities.length > 0 ? Math.round((compliant / entities.length) * 100) : 0,
    }
  })
}

export default function ReportsPage() {
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

  const stageAging = computeStageAging()
  const proposalOutcomes = computeProposalOutcomes()
  const lossReasons = lossReasonDistribution()
  const expansionSummary = computeExpansionSummary()
  const hygieneByEntity = computeHygieneByEntity()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Commercial analytics — relationship hygiene, pipeline aging, outcomes, and growth
        </p>
      </div>

      <ReportsDashboard
        stageAging={stageAging}
        proposalOutcomes={proposalOutcomes}
        lossReasons={lossReasons}
        expansionSummary={expansionSummary}
        hygieneByEntity={hygieneByEntity}
      />
    </div>
  )
}
