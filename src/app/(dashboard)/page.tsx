import { KpiCard } from '@/components/dashboard/kpi-card'
import { PipelineChart } from '@/components/dashboard/pipeline-chart'
import { ActionItems } from '@/components/dashboard/action-items'
import { CommercialHealth } from '@/components/dashboard/commercial-health'
import { OpsHealth } from '@/components/dashboard/ops-health'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import {
  signalToPursuitConversion,
  estimateReadyCycleTime,
  winRate,
  proposalAgingByBucket,
  jobsAwaitingPMClaim,
  readinessPassRate,
  pipelineValueByStage,
  actionItems,
  enrichedRecentActivity,
  nextActionHygiene,
  clientTierBreakdown,
  lossReasonDistribution,
  opsHealthSnapshot,
} from '@/lib/analytics/kpi-engine'
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

export default function HomePage() {
  // Seed data
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

  // Calculate KPIs
  const signalConv = signalToPursuitConversion()
  const estCycle = estimateReadyCycleTime()
  const wr = winRate()
  const proposalAging = proposalAgingByBucket()
  const pmClaim = jobsAwaitingPMClaim()
  const readiness = readinessPassRate()
  const pipeline = pipelineValueByStage()
  const items = actionItems()
  const activity = enrichedRecentActivity(20)
  const hygiene = nextActionHygiene()
  const tiers = clientTierBreakdown()
  const lossReasons = lossReasonDistribution()
  const opsData = opsHealthSnapshot()

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          BLU Crew Commercial ERP — Command Center
        </p>
      </div>

      {/* SECTION 1 — KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Signal→Pursuit"
          value={`${Math.round(signalConv.rate * 100)}%`}
          subtitle={`${signalConv.converted} of ${signalConv.passed} signals`}
          icon="zap"
          color="text-blue-400"
          href="/project-signals"
        />
        <KpiCard
          label="Est. Ready Cycle"
          value={`${estCycle.median_days}d`}
          subtitle={`${estCycle.sample_count} pursuits`}
          icon="clock"
          color="text-cyan-400"
          href="/pursuits"
        />
        <KpiCard
          label="Win Rate (90d)"
          value={wr.hasData ? `${Math.round(wr.rate * 100)}%` : 'N/A'}
          subtitle={wr.hasData ? `${wr.accepted}W / ${wr.rejected}L` : 'No decisions yet'}
          icon="trending_up"
          color="text-green-400"
          href="/proposals"
        />
        <KpiCard
          label="Active Proposals"
          value={String(proposalAging.total)}
          subtitle="Delivered / In Review / Hold"
          icon="file_text"
          color="text-amber-400"
          href="/proposals"
        />
        <KpiCard
          label="Awaiting PM Claim"
          value={String(pmClaim)}
          subtitle="Handoff posted"
          icon="users"
          color="text-purple-400"
          href="/handoffs"
        />
        <KpiCard
          label="Readiness Pass"
          value={`${Math.round(readiness.rate * 100)}%`}
          subtitle={`${readiness.first_attempt} of ${readiness.total} mobs`}
          icon="truck"
          color="text-emerald-400"
          href="/mobilizations"
        />
      </div>

      {/* SECTION 2 — My Action Items */}
      <ActionItems items={items} />

      {/* SECTION 3 — Pipeline Overview */}
      <PipelineChart data={pipeline} />

      {/* SECTION 4 + 5 — Commercial Health + Operations Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CommercialHealth
          hygiene={hygiene}
          tiers={tiers}
          proposalAging={proposalAging}
          lossReasons={lossReasons}
        />
        <OpsHealth data={opsData} />
      </div>

      {/* SECTION 6 — Recent Activity */}
      <ActivityFeed entries={activity} />
    </div>
  )
}
