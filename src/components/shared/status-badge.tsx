'use client'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// State → color mapping
// ---------------------------------------------------------------------------

const STATE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  // Client states
  watchlist: { bg: 'bg-slate-800', text: 'text-slate-300', dot: 'bg-slate-400' },
  target_client: { bg: 'bg-blue-900/50', text: 'text-blue-300', dot: 'bg-blue-400' },
  developing_relationship: { bg: 'bg-cyan-900/50', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  active_customer: { bg: 'bg-green-900/50', text: 'text-green-300', dot: 'bg-green-400' },
  strategic_preferred: { bg: 'bg-purple-900/50', text: 'text-purple-300', dot: 'bg-purple-400' },
  dormant: { bg: 'bg-amber-900/50', text: 'text-amber-300', dot: 'bg-amber-400' },
  archived: { bg: 'bg-gray-800', text: 'text-gray-400', dot: 'bg-gray-500' },

  // Generic / pipeline states
  draft: { bg: 'bg-slate-800', text: 'text-slate-300', dot: 'bg-slate-400' },
  in_progress: { bg: 'bg-blue-900/50', text: 'text-blue-300', dot: 'bg-blue-400' },
  pending_review: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  approved: { bg: 'bg-green-900/50', text: 'text-green-300', dot: 'bg-green-400' },
  rejected: { bg: 'bg-red-900/50', text: 'text-red-300', dot: 'bg-red-400' },
  completed: { bg: 'bg-emerald-900/50', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  cancelled: { bg: 'bg-gray-800', text: 'text-gray-400', dot: 'bg-gray-500' },
}

const DEFAULT_COLOR = { bg: 'bg-slate-800', text: 'text-slate-300', dot: 'bg-slate-400' }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  state: string
  label?: string
  className?: string
}

export function StatusBadge({ state, label, className }: StatusBadgeProps) {
  const colors = STATE_COLORS[state] ?? DEFAULT_COLOR
  const displayLabel = label ?? state.replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        colors.bg,
        colors.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
      {displayLabel}
    </span>
  )
}
