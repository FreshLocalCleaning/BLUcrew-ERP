import { KpiCard } from '@/components/dashboard/kpi-card'
import { PipelineChart } from '@/components/dashboard/pipeline-chart'
import { ProposalAgingChart } from '@/components/dashboard/proposal-aging-chart'
import { AlertsFeed } from '@/components/dashboard/alerts-feed'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import {
  signalToPursuitConversion,
  estimateReadyCycleTime,
  winRate,
  proposalAgingByBucket,
  jobsAwaitingPMClaim,
  readinessPassRate,
  pipelineValueByStage,
  activeAlerts,
  recentActivity,
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
  const alerts = activeAlerts()
  const activity = recentActivity(10)

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          BLU Crew Commercial ERP — Leadership Overview
        </p>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Signal→Pursuit"
          value={`${Math.round(signalConv.rate * 100)}%`}
          subtitle={`${signalConv.converted} of ${signalConv.passed} signals`}
          icon="zap"
          color="text-blue-400"
        />
        <KpiCard
          label="Est. Ready Cycle"
          value={`${estCycle.median_days}d`}
          subtitle={`${estCycle.sample_count} pursuits`}
          icon="clock"
          color="text-cyan-400"
        />
        <KpiCard
          label="Win Rate (90d)"
          value={`${Math.round(wr.rate * 100)}%`}
          subtitle={`${wr.accepted}W / ${wr.rejected}L`}
          icon="trending_up"
          color="text-green-400"
        />
        <KpiCard
          label="Active Proposals"
          value={String(proposalAging.total)}
          subtitle="Delivered / In Review"
          icon="file_text"
          color="text-amber-400"
        />
        <KpiCard
          label="Awaiting PM Claim"
          value={String(pmClaim)}
          subtitle="Handoff posted"
          icon="users"
          color="text-purple-400"
        />
        <KpiCard
          label="Readiness Pass"
          value={`${Math.round(readiness.rate * 100)}%`}
          subtitle={`${readiness.first_attempt} of ${readiness.total} mobs`}
          icon="truck"
          color="text-emerald-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PipelineChart data={pipeline} />
        <ProposalAgingChart data={proposalAging} />
      </div>

      {/* Alerts + Activity row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AlertsFeed alerts={alerts} limit={10} />
        <ActivityFeed entries={activity} />
      </div>
    </div>
  )
}
