'use client'

import Link from 'next/link'
import type { EnrichedActivity } from '@/lib/analytics/kpi-engine'

interface ActivityFeedProps {
  entries: EnrichedActivity[]
}

const GROUP_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  older: 'Earlier',
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
  transition: 'bg-purple-500',
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  // Group entries by date_group
  const groups: { label: string; items: EnrichedActivity[] }[] = []
  let currentGroup: string | null = null

  for (const entry of entries) {
    if (entry.date_group !== currentGroup) {
      currentGroup = entry.date_group
      groups.push({ label: GROUP_LABELS[entry.date_group] ?? entry.date_group, items: [] })
    }
    groups[groups.length - 1]!.items.push(entry)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
      <p className="mt-1 text-xs text-muted-foreground">Last {entries.length} events across all entities</p>
      <div className="mt-4 space-y-4 max-h-[500px] overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.items.map((entry) => (
                  <Link
                    key={entry.id}
                    href={entry.href}
                    className="flex gap-3 rounded-md p-2 -mx-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ACTION_COLORS[entry.action] ?? 'bg-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{entry.description}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString('en-US', {
                          month: 'short', day: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
