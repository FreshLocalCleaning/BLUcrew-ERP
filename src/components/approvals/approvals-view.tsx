'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { transitionEstimateAction } from '@/actions/estimate'
import { transitionChangeOrderAction } from '@/actions/change-order'
import { transitionProjectSignalAction } from '@/actions/project-signal'
import type { ApprovalItem } from '@/app/(dashboard)/approvals/page'
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ArrowRight,
  ClipboardCheck,
  Zap,
  Receipt,
  Inbox,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TYPE_CONFIG: Record<string, { icon: typeof FileText; color: string; bgColor: string }> = {
  estimate_qa: { icon: ClipboardCheck, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  co_internal_review: { icon: Receipt, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  co_client_pending: { icon: Receipt, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  closeout_plan: { icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  signal_gate: { icon: Zap, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface ApprovalsViewProps {
  items: ApprovalItem[]
}

export function ApprovalsView({ items: initialItems }: ApprovalsViewProps) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  async function handleApprove(item: ApprovalItem) {
    setProcessing(item.id)
    try {
      let result: { success: boolean; error?: string }

      if (item.entity_type === 'estimate' && item.approval_type === 'estimate_qa') {
        result = await transitionEstimateAction({
          estimate_id: item.entity_id,
          target_status: 'approved_for_proposal',
          reason: 'QA approved via Approvals page',
          approval_granted: true,
        })
      } else if (item.entity_type === 'change_order' && item.approval_type === 'co_internal_review') {
        result = await transitionChangeOrderAction({
          change_order_id: item.entity_id,
          target_status: 'client_pending',
          reason: 'Internal review approved — sent to client',
          approval_granted: true,
        })
      } else if (item.entity_type === 'change_order' && item.approval_type === 'co_client_pending') {
        result = await transitionChangeOrderAction({
          change_order_id: item.entity_id,
          target_status: 'approved',
          reason: 'Client approved change order',
          approval_granted: true,
        })
      } else if (item.entity_type === 'signal' && item.approval_type === 'signal_gate') {
        result = await transitionProjectSignalAction({
          signal_id: item.entity_id,
          target_state: 'passed',
          approval_granted: true,
        })
      } else {
        result = { success: false, error: 'Unknown approval type' }
      }

      if (result.success) {
        toast.success(`${item.type_label} approved: ${item.reference_id}`)
        setItems(prev => prev.filter(i => i.id !== item.id))
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to approve')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(item: ApprovalItem) {
    if (!rejectReason.trim()) return
    setProcessing(item.id)
    try {
      let result: { success: boolean; error?: string }

      if (item.entity_type === 'estimate' && item.approval_type === 'estimate_qa') {
        // Reject QA → back to in_build
        result = await transitionEstimateAction({
          estimate_id: item.entity_id,
          target_status: 'in_build',
          reason: `QA rejected: ${rejectReason}`,
          approval_granted: true,
        })
      } else if (item.entity_type === 'change_order' && item.approval_type === 'co_client_pending') {
        result = await transitionChangeOrderAction({
          change_order_id: item.entity_id,
          target_status: 'rejected',
          reason: `Client rejected: ${rejectReason}`,
          approval_granted: true,
        })
      } else if (item.entity_type === 'signal' && item.approval_type === 'signal_gate') {
        result = await transitionProjectSignalAction({
          signal_id: item.entity_id,
          target_state: 'failed',
          reason: rejectReason,
          approval_granted: true,
        })
      } else {
        result = { success: false, error: 'Rejection not supported for this type' }
      }

      if (result.success) {
        toast.success(`${item.type_label} rejected: ${item.reference_id}`)
        setItems(prev => prev.filter(i => i.id !== item.id))
        setRejectingId(null)
        setRejectReason('')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to reject')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setProcessing(null)
    }
  }

  // Group items by type
  const grouped = items.reduce<Record<string, ApprovalItem[]>>((acc, item) => {
    const key = item.approval_type
    if (!acc[key]) acc[key] = []
    acc[key]!.push(item)
    return acc
  }, {})

  const groupOrder = ['estimate_qa', 'co_internal_review', 'co_client_pending', 'closeout_plan', 'signal_gate']
  const groupLabels: Record<string, string> = {
    estimate_qa: 'Estimate QA Reviews',
    co_internal_review: 'Change Order Internal Reviews',
    co_client_pending: 'Change Order Client Decisions',
    closeout_plan: 'Closeout Plan Approvals',
    signal_gate: 'Signal Gate Reviews',
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-16 text-center">
        <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">No Pending Approvals</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything is caught up. Approval items will appear here when estimates need QA review,
          change orders need pricing approval, or signals need gate decisions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        {groupOrder.map(key => {
          const count = grouped[key]?.length ?? 0
          if (count === 0) return null
          const config = TYPE_CONFIG[key]!
          const Icon = config.icon
          return (
            <div
              key={key}
              className={cn('flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium', config.bgColor, config.color)}
            >
              <Icon className="h-4 w-4" />
              {count} {groupLabels[key]}
            </div>
          )
        })}
      </div>

      {/* Grouped approval items */}
      {groupOrder.map(key => {
        const group = grouped[key]
        if (!group || group.length === 0) return null
        const config = TYPE_CONFIG[key]!
        const Icon = config.icon

        return (
          <div key={key} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className={cn('h-5 w-5', config.color)} />
              <h2 className="text-lg font-semibold text-foreground">{groupLabels[key]}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {group.length}
              </span>
            </div>

            <div className="space-y-2">
              {group.map(item => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={item.detail_href}
                          className="text-sm font-semibold text-primary hover:underline truncate"
                        >
                          {item.reference_id} — {item.record_name}
                        </Link>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', config.bgColor, config.color)}>
                          {item.type_label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.what_needs_to_happen}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.requested_date)}
                        </span>
                        <span>Submitted by: {item.requested_by}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={item.detail_href}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <ArrowRight className="inline h-3 w-3 mr-1" />
                        View
                      </Link>
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={processing === item.id}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="inline h-3 w-3 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(rejectingId === item.id ? null : item.id)
                          setRejectReason('')
                        }}
                        disabled={processing === item.id}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="inline h-3 w-3 mr-1" />
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Reject reason input */}
                  {rejectingId === item.id && (
                    <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Rejection Reason (required)
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Explain why this is being rejected..."
                          rows={2}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <button
                        onClick={() => handleReject(item)}
                        disabled={!rejectReason.trim() || processing === item.id}
                        className={cn(
                          'rounded-md px-4 py-2 text-sm font-medium',
                          rejectReason.trim()
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'cursor-not-allowed bg-muted text-muted-foreground',
                        )}
                      >
                        Confirm Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
