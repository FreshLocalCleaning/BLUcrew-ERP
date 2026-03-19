'use client'

import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'

interface StateRibbonProps {
  currentState: string
  stateLabel: string
  nextAction?: string
  blockers?: string[]
  className?: string
}

export function StateRibbon({
  currentState,
  stateLabel,
  nextAction,
  blockers = [],
  className,
}: StateRibbonProps) {
  const hasBlockers = blockers.length > 0

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        {/* Current state */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Status
          </span>
          <StatusBadge state={currentState} label={stateLabel} />
        </div>

        {/* Next action */}
        {nextAction && (
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Next
            </span>
            <span className="text-sm text-foreground">{nextAction}</span>
          </div>
        )}

        {/* Blockers */}
        {hasBlockers ? (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">
              {blockers.length} blocker{blockers.length > 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          !hasBlockers &&
          nextAction && (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Ready to advance</span>
            </div>
          )
        )}
      </div>

      {/* Blocker details */}
      {hasBlockers && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3">
          {blockers.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
