'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StateRibbon } from '@/components/shared/state-ribbon'
import { StatusChangeModal } from '@/components/shared/status-change-modal'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  CHANGE_ORDER_STATE_LABELS,
  changeOrderStateMachine,
  type ChangeOrderState,
} from '@/lib/state-machines/change-order'
import {
  CHANGE_ORDER_ORIGIN_LABELS,
  CHANGE_ORDER_ORIGINS,
} from '@/types/commercial'
import type { ChangeOrderOrigin } from '@/types/commercial'
import { getAvailableTransitions } from '@/lib/state-machines/engine'
import {
  transitionChangeOrderAction,
  updateChangeOrderFieldsAction,
  sendToEstimatingAction,
} from '@/actions/change-order'
import type { ChangeOrder } from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import {
  ArrowLeftRight,
  FileText,
  DollarSign,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pencil,
  Save,
  X,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ChangeOrderDetailProps {
  changeOrder: ChangeOrder
  auditLog: AuditEntry[]
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type Tab = 'overview' | 'pricing' | 'approval' | 'release' | 'activity'

export function ChangeOrderDetail({ changeOrder: initial, auditLog }: ChangeOrderDetailProps) {
  const router = useRouter()
  const [changeOrder, setChangeOrder] = useState(initial)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Pricing edit state
  const [editingPricing, setEditingPricing] = useState(false)
  const [pricingOriginal, setPricingOriginal] = useState(
    changeOrder.pricing_delta?.original_value?.toString() ?? '',
  )
  const [pricingRevised, setPricingRevised] = useState(
    changeOrder.pricing_delta?.revised_value?.toString() ?? '',
  )
  const [pricingNotes, setPricingNotes] = useState(changeOrder.approval_notes ?? '')
  const [savingPricing, setSavingPricing] = useState(false)

  // Overview edit state
  const [editingOverview, setEditingOverview] = useState(false)
  const [editScopeDelta, setEditScopeDelta] = useState(changeOrder.scope_delta)
  const [editScheduleDelta, setEditScheduleDelta] = useState(changeOrder.schedule_delta ?? '')
  const [editMobImpact, setEditMobImpact] = useState(changeOrder.mobilization_impact ?? '')
  const [editOrigin, setEditOrigin] = useState<string>(changeOrder.origin)
  const [savingOverview, setSavingOverview] = useState(false)

  // Send to estimating state
  const [sendingToEstimating, setSendingToEstimating] = useState(false)

  const actorRoles: Role[] = ['leadership_system_admin', 'pm_ops']

  const availableTransitions = getAvailableTransitions(
    changeOrderStateMachine,
    changeOrder.status,
    actorRoles,
  )

  const isTerminal = changeOrder.status === 'closed'
  const isDraft = changeOrder.status === 'draft'
  const canEditPricing = ['draft', 'internal_review'].includes(changeOrder.status)

  async function handleStatusChange(targetState: string, reason: string) {
    const result = await transitionChangeOrderAction({
      change_order_id: changeOrder.id,
      target_status: targetState,
      reason: reason || undefined,
      approval_granted: true,
    })

    if (result.success && result.data) {
      setChangeOrder(result.data)
      toast.success(`Status changed to ${CHANGE_ORDER_STATE_LABELS[result.data.status]}`)
      setStatusModalOpen(false)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to change status')
    }
  }

  async function handleSavePricing() {
    const original = parseFloat(pricingOriginal) || 0
    const revised = parseFloat(pricingRevised) || 0
    const delta = revised - original

    setSavingPricing(true)
    const result = await updateChangeOrderFieldsAction({
      id: changeOrder.id,
      pricing_delta: { original_value: original, revised_value: revised, delta },
      priced_by: 'system',
      approval_notes: pricingNotes || null,
    })

    if (result.success && result.data) {
      setChangeOrder(result.data)
      setEditingPricing(false)
      toast.success('Pricing saved')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to save pricing')
    }
    setSavingPricing(false)
  }

  async function handleSaveOverview() {
    setSavingOverview(true)
    const result = await updateChangeOrderFieldsAction({
      id: changeOrder.id,
      scope_delta: editScopeDelta,
      schedule_delta: editScheduleDelta || null,
      mobilization_impact: editMobImpact || null,
      origin: editOrigin as ChangeOrderOrigin,
    })

    if (result.success && result.data) {
      setChangeOrder(result.data)
      setEditingOverview(false)
      toast.success('Overview updated')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to save overview')
    }
    setSavingOverview(false)
  }

  async function handleSendToEstimating() {
    setSendingToEstimating(true)
    const result = await sendToEstimatingAction({
      change_order_id: changeOrder.id,
    })

    if (result.success && result.data) {
      setChangeOrder(result.data)
      toast.success('Sent to Estimating — status changed to Internal Review')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to send to estimating')
    }
    setSendingToEstimating(false)
  }

  function startEditingPricing() {
    setPricingOriginal(changeOrder.pricing_delta?.original_value?.toString() ?? '')
    setPricingRevised(changeOrder.pricing_delta?.revised_value?.toString() ?? '')
    setPricingNotes(changeOrder.approval_notes ?? '')
    setEditingPricing(true)
  }

  function startEditingOverview() {
    setEditScopeDelta(changeOrder.scope_delta)
    setEditScheduleDelta(changeOrder.schedule_delta ?? '')
    setEditMobImpact(changeOrder.mobilization_impact ?? '')
    setEditOrigin(changeOrder.origin)
    setEditingOverview(true)
  }

  const pricingDelta = (() => {
    const o = parseFloat(pricingOriginal) || 0
    const r = parseFloat(pricingRevised) || 0
    return r - o
  })()

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'pricing', label: 'Pricing' },
    { key: 'approval', label: 'Approval' },
    { key: 'release', label: 'Release' },
    { key: 'activity', label: 'Activity' },
  ]

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* State Ribbon */}
        <StateRibbon
          currentState={changeOrder.status}
          stateLabel={CHANGE_ORDER_STATE_LABELS[changeOrder.status]}
          nextAction={changeOrder.next_action ?? undefined}
        />

        {/* Rejected banner */}
        {changeOrder.status === 'rejected' && changeOrder.rejection_reason && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Rejected by Client</p>
                <p className="text-sm text-red-700 dark:text-red-300">{changeOrder.rejection_reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Change Order Details</h2>
                {isDraft && !editingOverview && (
                  <button
                    onClick={startEditingOverview}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                {editingOverview && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingOverview(false)}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                    <button
                      onClick={handleSaveOverview}
                      disabled={savingOverview}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" /> {savingOverview ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              {!editingOverview ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailItem icon={FileText} label="Reference ID" value={changeOrder.reference_id} mono />
                  <DetailItem icon={FileText} label="Origin" value={CHANGE_ORDER_ORIGIN_LABELS[changeOrder.origin as ChangeOrderOrigin] ?? changeOrder.origin} />
                  <DetailItem icon={Users} label="Fact Packet By" value={changeOrder.fact_packet_by} />
                  <DetailItem icon={Clock} label="Created" value={formatDate(changeOrder.created_at)} />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailItem icon={FileText} label="Reference ID" value={changeOrder.reference_id} mono />
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Origin</label>
                    <select
                      value={editOrigin}
                      onChange={e => setEditOrigin(e.target.value)}
                      className={inputClass}
                    >
                      {CHANGE_ORDER_ORIGINS.map(o => (
                        <option key={o} value={o}>{CHANGE_ORDER_ORIGIN_LABELS[o]}</option>
                      ))}
                    </select>
                  </div>
                  <DetailItem icon={Users} label="Fact Packet By" value={changeOrder.fact_packet_by} />
                  <DetailItem icon={Clock} label="Created" value={formatDate(changeOrder.created_at)} />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Scope Delta</h2>
              {editingOverview ? (
                <textarea
                  value={editScopeDelta}
                  onChange={e => setEditScopeDelta(e.target.value)}
                  rows={4}
                  className={inputClass}
                  placeholder="Describe the scope change..."
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-foreground">{changeOrder.scope_delta}</p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Impact</h2>
              {editingOverview ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Schedule Impact</label>
                    <input
                      type="text"
                      value={editScheduleDelta}
                      onChange={e => setEditScheduleDelta(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Adds 2 days to Phase 3"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Mobilization Impact</label>
                    <input
                      type="text"
                      value={editMobImpact}
                      onChange={e => setEditMobImpact(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Requires additional trip"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailItem icon={Clock} label="Schedule Impact" value={changeOrder.schedule_delta ?? '—'} />
                  <DetailItem icon={AlertTriangle} label="Mobilization Impact" value={changeOrder.mobilization_impact ?? '—'} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Pricing Delta</h2>
                {canEditPricing && !editingPricing && (
                  <button
                    onClick={startEditingPricing}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Pricing
                  </button>
                )}
                {editingPricing && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingPricing(false)}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                    <button
                      onClick={handleSavePricing}
                      disabled={savingPricing}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" /> {savingPricing ? 'Saving...' : 'Save Pricing'}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Pricing fields are editable only by Estimating, Commercial/BD, or Leadership.
                PM who documented facts cannot also price the change order.
              </p>

              {editingPricing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                        Original Value ($)
                      </label>
                      <input
                        type="number"
                        value={pricingOriginal}
                        onChange={e => setPricingOriginal(e.target.value)}
                        className={inputClass}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                        Revised Value ($)
                      </label>
                      <input
                        type="number"
                        value={pricingRevised}
                        onChange={e => setPricingRevised(e.target.value)}
                        className={inputClass}
                        placeholder="0"
                      />
                    </div>
                    <div className={cn(
                      'rounded-lg border p-4 text-center',
                      pricingDelta >= 0
                        ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                        : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
                    )}>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Delta (auto)</p>
                      <p className={cn(
                        'mt-1 text-xl font-semibold',
                        pricingDelta >= 0 ? 'text-green-700' : 'text-red-700',
                      )}>
                        {pricingDelta >= 0 ? '+' : ''}{formatCurrency(pricingDelta)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                      Priced By
                    </label>
                    <p className="text-sm text-muted-foreground">Auto-set to current user on save</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                      Pricing Notes / Assumptions
                    </label>
                    <textarea
                      value={pricingNotes}
                      onChange={e => setPricingNotes(e.target.value)}
                      rows={3}
                      className={inputClass}
                      placeholder="Justification, assumptions, rate basis..."
                    />
                  </div>
                </div>
              ) : changeOrder.pricing_delta ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-border p-4 text-center">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Original Value</p>
                      <p className="mt-1 text-xl font-semibold text-foreground">
                        {formatCurrency(changeOrder.pricing_delta.original_value)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border p-4 text-center">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Revised Value</p>
                      <p className="mt-1 text-xl font-semibold text-foreground">
                        {formatCurrency(changeOrder.pricing_delta.revised_value)}
                      </p>
                    </div>
                    <div className={cn(
                      'rounded-lg border p-4 text-center',
                      changeOrder.pricing_delta.delta >= 0
                        ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                        : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
                    )}>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Delta</p>
                      <p className={cn(
                        'mt-1 text-xl font-semibold',
                        changeOrder.pricing_delta.delta >= 0 ? 'text-green-700' : 'text-red-700',
                      )}>
                        {changeOrder.pricing_delta.delta >= 0 ? '+' : ''}{formatCurrency(changeOrder.pricing_delta.delta)}
                      </p>
                    </div>
                  </div>
                  {changeOrder.approval_notes && (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Pricing Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{changeOrder.approval_notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No pricing delta set yet. Awaiting Estimating/Commercial review.</p>
              )}
              <div className="mt-4">
                <DetailItem icon={Users} label="Priced By" value={changeOrder.priced_by ?? 'Not yet priced'} />
              </div>
            </div>
          </div>
        )}

        {/* Approval Tab */}
        {activeTab === 'approval' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Client Approval Tracking</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem icon={Clock} label="Client Response Date" value={formatDate(changeOrder.client_response_date)} />
                <DetailItem
                  icon={changeOrder.status === 'approved' ? CheckCircle : changeOrder.status === 'rejected' ? XCircle : FileText}
                  label="Decision"
                  value={changeOrder.status === 'approved' ? 'Approved' : changeOrder.status === 'rejected' ? 'Rejected' : 'Pending'}
                />
              </div>
              {changeOrder.approval_notes && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Approval Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{changeOrder.approval_notes}</p>
                </div>
              )}
              {changeOrder.rejection_reason && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Rejection Reason</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-red-600">{changeOrder.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Release Tab */}
        {activeTab === 'release' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Release Details</h2>
              {changeOrder.status === 'released' || changeOrder.status === 'closed' ? (
                <div className="space-y-4">
                  {changeOrder.release_notes && (
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Release Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{changeOrder.release_notes}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DetailItem icon={FileText} label="Linked Project" value={changeOrder.linked_project_id.slice(0, 8) + '…'} />
                    <DetailItem icon={FileText} label="Linked Mobilization" value={changeOrder.linked_mobilization_id ?? 'Project-level'} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Change order must be approved before it can be released.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Activity Timeline</h2>
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {auditLog.slice().reverse().map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {entry.action === 'create' ? 'Record created' : entry.action === 'update' ? 'Record updated' : entry.action}
                        </span>
                        {entry.action === 'update' && entry.field_changes['status'] && (
                          <StatusBadge
                            state={String(entry.field_changes['status'].to)}
                            label={CHANGE_ORDER_STATE_LABELS[entry.field_changes['status'].to as ChangeOrderState]}
                          />
                        )}
                      </div>
                      {entry.reason && (
                        <p className="mt-0.5 text-xs text-muted-foreground">Reason: {entry.reason}</p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                        {' · '}{entry.actor_id}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="hidden w-72 shrink-0 space-y-6 lg:block">
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Actions
          </h3>
          {!isTerminal && (
            <button
              onClick={() => setStatusModalOpen(true)}
              className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
            >
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              Change Status
            </button>
          )}
          {/* Send to Estimating — only in draft */}
          {isDraft && (
            <button
              onClick={handleSendToEstimating}
              disabled={sendingToEstimating}
              className="flex w-full items-center gap-2 rounded-md border border-amber-600 bg-amber-900/20 px-3 py-2 text-sm font-medium text-amber-300 hover:bg-amber-900/40 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sendingToEstimating ? 'Sending...' : 'Send to Estimating'}
            </button>
          )}
        </div>

        {/* Pricing summary card */}
        {changeOrder.pricing_delta && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Pricing Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original</span>
                <span className="text-foreground">{formatCurrency(changeOrder.pricing_delta.original_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revised</span>
                <span className="text-foreground">{formatCurrency(changeOrder.pricing_delta.revised_value)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-medium text-muted-foreground">Delta</span>
                <span className={cn('font-medium', changeOrder.pricing_delta.delta >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {changeOrder.pricing_delta.delta >= 0 ? '+' : ''}{formatCurrency(changeOrder.pricing_delta.delta)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        currentState={changeOrder.status}
        currentStateLabel={CHANGE_ORDER_STATE_LABELS[changeOrder.status]}
        availableTransitions={availableTransitions}
        stateLabels={CHANGE_ORDER_STATE_LABELS}
        onConfirm={handleStatusChange}
      />
    </div>
  )
}

function DetailItem({
  icon: Icon, label, value, mono,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className={`text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  )
}
