'use client'

import type { AuditEntry } from '@/lib/db/json-db'

interface ActivityFeedProps {
  entries: AuditEntry[]
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
      <p className="mt-1 text-xs text-muted-foreground">Last {entries.length} events across all entities</p>
      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex gap-3">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground capitalize">
                    {entry.action === 'create' ? 'Created' : entry.action === 'update' ? 'Updated' : entry.action}
                  </span>
                  <span className="text-xs text-muted-foreground">{entry.entity_type}</span>
                </div>
                {entry.reason && (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">{entry.reason}</p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleString('en-US', {
                    month: 'short', day: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}
                  {' · '}{entry.actor_id}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
