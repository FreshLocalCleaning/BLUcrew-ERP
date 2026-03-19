import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import {
  runAllChecks,
  getMigrationWaves,
  getSystemHealth,
} from '@/lib/analytics/cutover-checks'
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

export default function CutoverPage() {
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

  const checks = runAllChecks()
  const waves = getMigrationWaves()
  const health = getSystemHealth()

  const passCount = checks.filter(c => c.status === 'pass').length
  const failCount = checks.filter(c => c.status === 'fail').length
  const manualCount = checks.filter(c => c.status === 'manual').length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cutover Readiness</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Go-live gate verification, migration status, and system health per ERP-19
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm text-green-800 dark:text-green-200">Passed</p>
          <p className="mt-1 text-3xl font-bold text-green-700 dark:text-green-300">{passCount}</p>
        </div>
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">Failed</p>
          <p className="mt-1 text-3xl font-bold text-red-700 dark:text-red-300">{failCount}</p>
        </div>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Manual Review</p>
          <p className="mt-1 text-3xl font-bold text-amber-700 dark:text-amber-300">{manualCount}</p>
        </div>
      </div>

      {/* Go-Live Gates */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Go-Live Gate Checklist</h2>
        <div className="space-y-3">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center justify-between rounded border border-border px-4 py-3">
              <div className="flex items-center gap-3">
                {check.status === 'pass' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {check.status === 'fail' && <XCircle className="h-5 w-5 text-red-500" />}
                {check.status === 'manual' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                <div>
                  <p className="text-sm font-medium text-foreground">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                </div>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${
                check.status === 'pass' ? 'bg-green-100 text-green-800' :
                check.status === 'fail' ? 'bg-red-100 text-red-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {check.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Migration Waves */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Migration Waves (ERP-19)</h2>
        <div className="space-y-4">
          {waves.map((wave) => (
            <div key={wave.wave} className="rounded border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">{wave.wave}: {wave.label}</h3>
                <span className="text-xs text-muted-foreground">
                  {wave.entities.reduce((s, e) => s + e.count, 0)} records
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {wave.entities.map((entity) => (
                  <div key={entity.name} className="rounded bg-muted/50 px-3 py-2 text-center">
                    <p className="text-xs text-muted-foreground">{entity.name}</p>
                    <p className="text-lg font-semibold text-foreground">{entity.count}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">System Health</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Entities</p>
            <p className="text-2xl font-bold text-foreground">
              {health.entity_counts.reduce((s, e) => s + e.count, 0)}
            </p>
          </div>
          <div className="rounded border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Audit Log Entries</p>
            <p className="text-2xl font-bold text-foreground">{health.audit_log_count}</p>
          </div>
          <div className="rounded border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Integration Events</p>
            <p className="text-2xl font-bold text-foreground">
              {health.integration_events.pending + health.integration_events.sent + health.integration_events.failed + health.integration_events.manual_override}
            </p>
          </div>
          <div className="rounded border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Failed Events</p>
            <p className="text-2xl font-bold text-red-600">{health.integration_events.failed}</p>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Records by Collection</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {health.entity_counts.map((ec) => (
              <div key={ec.name} className="flex items-center justify-between rounded bg-muted/30 px-3 py-2">
                <span className="text-xs text-foreground">{ec.name.replace(/_/g, ' ')}</span>
                <span className="text-sm font-medium text-foreground">{ec.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
