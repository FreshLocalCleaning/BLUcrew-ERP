'use client'

import { useState } from 'react'
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
  ChevronDown,
  ChevronRight,
  Phone,
  Briefcase,
  Landmark,
  Wrench,
  TrendingUp,
} from 'lucide-react'
import type { ActionItem, ActionCategory } from '@/lib/analytics/kpi-engine'
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

interface CategoryConfig {
  key: ActionCategory
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'contact_followups', label: 'Contact Follow-ups', icon: Phone, color: 'text-blue-500' },
  { key: 'pipeline', label: 'Pipeline Actions', icon: Briefcase, color: 'text-cyan-500' },
  { key: 'commercial', label: 'Commercial Actions', icon: Landmark, color: 'text-amber-500' },
  { key: 'operations', label: 'Operations Actions', icon: Wrench, color: 'text-emerald-500' },
  { key: 'growth', label: 'Growth Actions', icon: TrendingUp, color: 'text-purple-500' },
]

interface ActionItemsProps {
  items: ActionItem[]
}

export function ActionItems({ items }: ActionItemsProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Urgency counts
  const overdueCount = items.filter((i) => i.days_overdue != null && i.days_overdue > 0).length
  const todayCount = items.filter((i) => i.days_until === 0 || i.days_overdue === 0).length
  const thisWeekCount = items.filter((i) => i.days_until != null && i.days_until > 0 && i.days_until <= 7).length

  // Group by category
  const grouped = new Map<ActionCategory, ActionItem[]>()
  for (const cat of CATEGORIES) {
    grouped.set(cat.key, [])
  }
  for (const item of items) {
    const bucket = grouped.get(item.category)
    if (bucket) bucket.push(item)
    else grouped.get('pipeline')!.push(item)
  }

  function toggleSection(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

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

      {/* Summary strip */}
      <div className="mt-2 flex items-center gap-3 flex-wrap text-xs font-medium">
        {overdueCount > 0 && (
          <span className="text-red-500">{overdueCount} overdue</span>
        )}
        {todayCount > 0 && (
          <span className="text-amber-500">{todayCount} due today</span>
        )}
        {thisWeekCount > 0 && (
          <span className="text-green-500">{thisWeekCount} this week</span>
        )}
        {overdueCount === 0 && todayCount === 0 && thisWeekCount === 0 && (
          <span className="text-muted-foreground">All clear</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground py-4 text-center">All clear — no action items.</p>
      ) : (
        <div className="mt-4 space-y-4 max-h-[600px] overflow-y-auto">
          {CATEGORIES.map((cat) => {
            const catItems = grouped.get(cat.key) ?? []
            if (catItems.length === 0) return null
            const isCollapsed = collapsed[cat.key] ?? false
            const CatIcon = cat.icon
            const catOverdue = catItems.filter((i) => i.days_overdue != null && i.days_overdue > 0).length
            return (
              <div key={cat.key}>
                <button
                  onClick={() => toggleSection(cat.key)}
                  className="flex w-full items-center gap-2 py-1.5 text-left group"
                >
                  {isCollapsed
                    ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                  <CatIcon className={cn('h-4 w-4', cat.color)} />
                  <span className="text-sm font-semibold text-foreground">{cat.label}</span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                    catOverdue > 0 ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground',
                  )}>
                    {catItems.length}
                  </span>
                  {catOverdue > 0 && (
                    <span className="text-[10px] text-red-500 font-medium">
                      {catOverdue} overdue
                    </span>
                  )}
                </button>
                {!isCollapsed && (
                  <div className="ml-6 mt-1 space-y-1.5">
                    {catItems.map((item, i) => (
                      <ActionItemRow key={`${cat.key}-${i}`} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ActionItemRow({ item }: { item: ActionItem }) {
  const config = TYPE_CONFIG[item.type] ?? { icon: AlertTriangle, color: 'text-muted-foreground', label: item.type }
  const Icon = config.icon

  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/30 transition-colors"
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', config.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {item.name}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">({item.ref_id})</span>
          {item.days_overdue != null && item.days_overdue > 0 && (
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
        <p className="mt-0.5 text-xs text-muted-foreground truncate">{item.message}</p>
        {item.contact_owner && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Owner: {item.contact_owner}
            {item.client_name ? ` · ${item.client_name}` : ''}
          </p>
        )}
      </div>
      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium', config.color, 'bg-transparent')}>
        {config.label}
      </span>
    </Link>
  )
}
