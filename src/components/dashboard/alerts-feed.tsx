'use client'

import Link from 'next/link'
import { AlertTriangle, Clock, Pause, Truck } from 'lucide-react'
import type { Alert } from '@/lib/analytics/kpi-engine'

const ALERT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  overdue_next_action: Clock,
  blocked_mobilization: Truck,
  stalled_pursuit: Pause,
}

const ALERT_COLORS: Record<string, string> = {
  overdue_next_action: 'text-red-500',
  blocked_mobilization: 'text-orange-500',
  stalled_pursuit: 'text-yellow-500',
}

function entityHref(entityType: string, entityId: string): string {
  const routes: Record<string, string> = {
    clients: '/clients',
    pursuits: '/pursuits',
    estimates: '/estimates',
    proposals: '/proposals',
    award_handoffs: '/handoffs',
    projects: '/projects',
    mobilizations: '/mobilizations',
    change_orders: '/change-orders',
  }
  const base = routes[entityType] ?? ''
  return `${base}/${entityId}`
}

interface AlertsFeedProps {
  alerts: Alert[]
  limit?: number
}

export function AlertsFeed({ alerts, limit = 10 }: AlertsFeedProps) {
  const shown = alerts.slice(0, limit)

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">Active Alerts</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {alerts.length} actionable item{alerts.length !== 1 ? 's' : ''}
      </p>
      <div className="mt-4 space-y-3">
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active alerts.</p>
        ) : (
          shown.map((alert, i) => {
            const Icon = ALERT_ICONS[alert.type] ?? AlertTriangle
            const color = ALERT_COLORS[alert.type] ?? 'text-muted-foreground'
            return (
              <Link
                key={i}
                href={entityHref(alert.entity_type, alert.entity_id)}
                className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/30 transition-colors"
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary">{alert.ref_id}</span>
                    <span className="text-xs text-muted-foreground">{alert.entity_type}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-foreground truncate">{alert.message}</p>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
