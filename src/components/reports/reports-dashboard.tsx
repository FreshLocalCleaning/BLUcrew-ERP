'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

// ---------------------------------------------------------------------------
// Props types
// ---------------------------------------------------------------------------

interface StageAgingData {
  stage: string
  avg_days: number
  count: number
}

interface ProposalOutcome {
  name: string
  value: number
}

interface LossReason {
  reason: string
  count: number
}

interface ExpansionSummary {
  status: string
  count: number
}

interface HygieneData {
  entity: string
  rate: number
}

interface ReportsDashboardProps {
  stageAging: StageAgingData[]
  proposalOutcomes: ProposalOutcome[]
  lossReasons: LossReason[]
  expansionSummary: ExpansionSummary[]
  hygieneByEntity: HygieneData[]
}

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6b7280', '#3b82f6']
const BAR_COLORS = ['#3b82f6', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6']

export function ReportsDashboard({
  stageAging,
  proposalOutcomes,
  lossReasons,
  expansionSummary,
  hygieneByEntity,
}: ReportsDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Relationship Hygiene */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Next-Action Hygiene by Entity</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          % of active records with owner + next_action + next_action_date
        </p>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hygieneByEntity}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="entity" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
                formatter={(value) => [`${Number(value).toFixed(0)}%`, 'Hygiene']}
              />
              <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-col: stage aging + proposal outcomes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Stage Aging */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Pursuit Stage Aging</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Average days in each pursuit stage
          </p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageAging} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="stage" width={140} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: 12,
                  }}
                  formatter={(value, _, props) => [
                    `${Number(value).toFixed(0)} days (${(props as { payload: StageAgingData }).payload.count} pursuits)`,
                    'Avg',
                  ]}
                />
                <Bar dataKey="avg_days" radius={[0, 4, 4, 0]}>
                  {stageAging.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Proposal Outcomes Pie */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Proposal Outcomes</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Win / Loss / Dormant breakdown
          </p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={proposalOutcomes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  dataKey="value"
                >
                  {proposalOutcomes.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two-col: loss reasons + expansion */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Loss Reason Analysis */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Loss Reason Analysis</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Top rejection reasons
          </p>
          {lossReasons.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No rejections recorded yet.</p>
          ) : (
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lossReasons} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="reason" width={160} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Expansion Signals */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Expansion Tasks</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Growth tasks by status
          </p>
          <div className="mt-4 space-y-2">
            {expansionSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expansion tasks yet.</p>
            ) : (
              expansionSummary.map((item) => (
                <div key={item.status} className="flex items-center justify-between rounded border border-border px-3 py-2">
                  <span className="text-sm capitalize text-foreground">
                    {item.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-medium text-foreground">{item.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
