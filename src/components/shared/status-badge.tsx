'use client'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// State → color mapping
// ---------------------------------------------------------------------------

const STATE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  // Client states (ERP-13: 6 states)
  watchlist: { bg: 'bg-slate-800', text: 'text-slate-300', dot: 'bg-slate-400' },
  target_client: { bg: 'bg-blue-900/50', text: 'text-blue-300', dot: 'bg-blue-400' },
  developing_relationship: { bg: 'bg-cyan-900/50', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  active_client: { bg: 'bg-green-900/50', text: 'text-green-300', dot: 'bg-green-400' },
  dormant: { bg: 'bg-amber-900/50', text: 'text-amber-300', dot: 'bg-amber-400' },
  archived: { bg: 'bg-gray-800', text: 'text-gray-400', dot: 'bg-gray-500' },

  // Project Signal states
  received: { bg: 'bg-slate-800', text: 'text-slate-300', dot: 'bg-slate-400' },
  under_review: { bg: 'bg-blue-900/50', text: 'text-blue-300', dot: 'bg-blue-400' },
  passed: { bg: 'bg-emerald-900/50', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  failed: { bg: 'bg-red-900/50', text: 'text-red-300', dot: 'bg-red-400' },
  deferred: { bg: 'bg-amber-900/50', text: 'text-amber-300', dot: 'bg-amber-400' },
  pending: { bg: 'bg-slate-800', text: 'text-slate-300', dot: 'bg-slate-400' },

  // Pursuit stages (ERP-13: 12 stages)
  project_signal_received: { bg: 'bg-indigo-900/50', text: 'text-indigo-300', dot: 'bg-indigo-400' },
  qualification_underway: { bg: 'bg-blue-900/50', text: 'text-blue-300', dot: 'bg-blue-400' },
  qualified_pursuit: { bg: 'bg-sky-900/50', text: 'text-sky-300', dot: 'bg-sky-400' },
  preconstruction_packet_open: { bg: 'bg-violet-900/50', text: 'text-violet-300', dot: 'bg-violet-400' },
  site_walk_scheduled: { bg: 'bg-cyan-900/50', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  site_walk_complete: { bg: 'bg-teal-900/50', text: 'text-teal-300', dot: 'bg-teal-400' },
  pursue_no_bid_review: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  blu_closeout_plan_sent: { bg: 'bg-lime-900/50', text: 'text-lime-300', dot: 'bg-lime-400' },
  estimate_ready: { bg: 'bg-emerald-900/50', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  hold: { bg: 'bg-orange-900/50', text: 'text-orange-300', dot: 'bg-orange-400' },
  no_bid: { bg: 'bg-red-900/50', text: 'text-red-300', dot: 'bg-red-400' },

  // Estimate statuses (ERP-13 Table 11)
  in_build: { bg: 'bg-blue-900/50', text: 'text-blue-300', dot: 'bg-blue-400' },
  qa_review: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  approved_for_proposal: { bg: 'bg-emerald-900/50', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  superseded: { bg: 'bg-gray-800', text: 'text-gray-400', dot: 'bg-gray-500' },

  // Proposal statuses (ERP-13 Table 12)
  delivered: { bg: 'bg-indigo-900/50', text: 'text-indigo-300', dot: 'bg-indigo-400' },
  in_review: { bg: 'bg-cyan-900/50', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  accepted: { bg: 'bg-green-900/50', text: 'text-green-300', dot: 'bg-green-400' },

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
