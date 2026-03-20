'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

const PROJECT_STATE_LABELS: Record<string, string> = {
  startup_pending: 'Startup',
  forecasting_active: 'Forecasting',
  execution_active: 'Execution',
  operationally_complete: 'Ops Complete',
  financially_open: 'Fin. Open',
  financially_closed: 'Closed',
  dispute_hold: 'Dispute',
}

const MOB_STATE_LABELS: Record<string, string> = {
  handoff_incomplete: 'Handoff Inc.',
  needs_planning: 'Needs Planning',
  blocked: 'Blocked',
  ready: 'Ready',
  in_field: 'In Field',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

const CO_STATE_LABELS: Record<string, string> = {
  draft: 'Draft',
  internal_review: 'Internal Review',
  client_pending: 'Client Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  released: 'Released',
  closed: 'Closed',
}

interface OpsHealthProps {
  data: {
    projectsByStatus: Record<string, number>
    totalProjects: number
    mobsThisMonth: number
    mobsByState: Record<string, number>
    coByStatus: Record<string, number>
    totalCOs: number
    financiallyOpen: number
    financiallyOpenDays: number
  }
}

function StatusBreakdown({ items, labels, href, limit }: {
  items: Record<string, number>
  labels: Record<string, string>
  href: string
  limit?: number
}) {
  const sorted = Object.entries(items).sort(([, a], [, b]) => b - a)
  const shown = limit ? sorted.slice(0, limit) : sorted

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map(([status, count]) => (
        <Link
          key={status}
          href={href}
          className="rounded border border-border px-2 py-1 text-center hover:bg-muted/30 transition-colors"
        >
          <span className="text-sm font-bold text-foreground">{count}</span>
          <span className="ml-1 text-[10px] text-muted-foreground">{labels[status] ?? status}</span>
        </Link>
      ))}
    </div>
  )
}

export function OpsHealth({ data }: OpsHealthProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">Operations Health</h2>
      <p className="mt-1 text-xs text-muted-foreground">Project, mobilization, and change order status</p>

      <div className="mt-4 space-y-5">
        {/* Active Projects */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Projects</span>
            <Link href="/projects" className="text-xs text-primary hover:underline">{data.totalProjects} total</Link>
          </div>
          <StatusBreakdown items={data.projectsByStatus} labels={PROJECT_STATE_LABELS} href="/projects" />
        </div>

        {/* Mobilizations */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Mobilizations</span>
            <span className="text-xs text-muted-foreground">{data.mobsThisMonth} this month</span>
          </div>
          <StatusBreakdown items={data.mobsByState} labels={MOB_STATE_LABELS} href="/mobilizations" />
        </div>

        {/* Change Orders */}
        {data.totalCOs > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Change Orders</span>
              <Link href="/change-orders" className="text-xs text-primary hover:underline">{data.totalCOs} total</Link>
            </div>
            <StatusBreakdown items={data.coByStatus} labels={CO_STATE_LABELS} href="/change-orders" />
          </div>
        )}

        {/* AR Aging */}
        {data.financiallyOpen > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <Link href="/projects" className="flex items-center justify-between hover:underline">
              <div>
                <span className="text-sm font-medium text-amber-500">AR Aging</span>
                <p className="text-xs text-muted-foreground">{data.financiallyOpen} projects financially open</p>
              </div>
              <span className="text-lg font-bold text-amber-500">{data.financiallyOpenDays}d</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
