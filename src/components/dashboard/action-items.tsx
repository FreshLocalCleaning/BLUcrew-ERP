'use client'

import Link from 'next/link'
import {
  Clock,
  AlertTriangle,
  Truck,
  DollarSign,
  FileText,
  Users,
  Pause,
  Target,
  CalendarClock,
  Building2,
  CheckCircle,
} from 'lucide-react'
import type { ActionItem } from '@/lib/analytics/kpi-engine'
import { cn } from '@/lib/utils'

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  overdue: { icon: Clock, color: 'text-red-500', label: 'Overdue' },
  upcoming: { icon: CalendarClock, color: 'text-green-500', label: 'Upcoming' },
  stalled_pursuit: { icon: Pause, color: 'text-yellow-500', label: 'Stalled' },
  estimate_qa: { icon: Target, color: 'text-cyan-500', label: 'QA Review' },
  co_needs_pricing: { icon: DollarSign, color: 'text-amber-500', label: 'Needs Pricing' },
  proposal_stale: { icon: FileText, color: 'text-orange-500', label: 'Awaiting Decision' },
  awaiting_pm_claim: { icon: Users, color: 'text-purple-500', label: 'Needs PM' },
  blocked_mob: { icon: Truck, color: 'text-red-500', label: 'Blocked' },
  pm15_review: { icon: CheckCircle, color: 'text-blue-500', label: 'Review Due' },
  invoice_pending: { icon: Building2, color: 'text-emerald-500', label: 'Invoice Pending' },
}

const ENTITY_LABELS: Record<string, string> = {
  clients: 'Client',
  contacts: 'Contact',
  project_signals: 'Signal',
  pursuits: 'Pursuit',
  estimates: 'Estimate',
  proposals: 'Proposal',
  award_handoffs: 'Handoff',
  projects: 'Project',
  mobilizations: 'Mob',
  change_orders: 'CO',
  expansion_tasks: 'Growth',
}

interface ActionItemsProps {
  items: ActionItem[]
}

export function ActionItems({ items }: ActionItemsProps) {
  const overdue = items.filter((i) => i.type === 'overdue')
  const other = items.filter((i) => i.type !== 'overdue')

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">My Action Items</h2>
        <span className={cn(
          'rounded-full px-2.5 py-0.5 text-xs font-bold',
          items.length > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500',
        )}>
          {items.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {overdue.length > 0 ? `${overdue.length} overdue` : 'Nothing overdue'}
        {other.length > 0 ? ` · ${other.length} other items` : ''}
      </p>

      <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">All clear — no action items.</p>
        ) : (
          items.map((item, i) => {
            const config = TYPE_CONFIG[item.type] ?? { icon: AlertTriangle, color: 'text-muted-foreground', label: item.type }
            const Icon = config.icon
            return (
              <Link
                key={i}
                href={item.href}
                className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/30 transition-colors"
              >
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', config.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-primary">{item.ref_id}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{ENTITY_LABELS[item.entity_type] ?? item.entity_type}</span>
                    {item.days_overdue != null && (
                      <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                        {item.days_overdue}d overdue
                      </span>
                    )}
                    {item.days_until != null && (
                      <span className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                        item.days_until === 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500',
                      )}>
                        {item.days_until === 0 ? 'Today' : `${item.days_until}d`}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-foreground truncate">{item.message}</p>
                </div>
                <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium', config.color, 'bg-transparent')}>
                  {config.label}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
