import {
  Users,
  Target,
  FileText,
  Award,
  TrendingUp,
  Clock,
} from 'lucide-react'

const STATS = [
  { label: 'Active Clients', value: '—', icon: Users, color: 'text-blue-400' },
  { label: 'Open Pursuits', value: '—', icon: Target, color: 'text-cyan-400' },
  { label: 'Pending Proposals', value: '—', icon: FileText, color: 'text-amber-400' },
  { label: 'Active Awards', value: '—', icon: Award, color: 'text-green-400' },
  { label: 'Pipeline Value', value: '—', icon: TrendingUp, color: 'text-purple-400' },
  { label: 'Pending Approvals', value: '—', icon: Clock, color: 'text-red-400' },
]

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          BLU Crew Commercial Pipeline — Overview
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {stat.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Pipeline Chart
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Recharts pipeline visualization will render here.
          </p>
          <div className="mt-4 flex h-48 items-center justify-center rounded-md border border-dashed border-border">
            <span className="text-sm text-muted-foreground">
              Chart placeholder
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Activity
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Activity timeline will render here.
          </p>
          <div className="mt-4 flex h-48 items-center justify-center rounded-md border border-dashed border-border">
            <span className="text-sm text-muted-foreground">
              Timeline placeholder
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
