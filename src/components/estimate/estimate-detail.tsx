'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StateRibbon } from '@/components/shared/state-ribbon'
import { StatusChangeModal } from '@/components/shared/status-change-modal'
import { StatusBadge } from '@/components/shared/status-badge'
import { EstimatorBridge } from './estimator-bridge'
import {
  ESTIMATE_STATUS_LABELS,
  ESTIMATE_ACTIVE_STATUSES,
  estimateStateMachine,
  type EstimateStatus,
} from '@/lib/state-machines/estimate'
import { getAvailableTransitions } from '@/lib/state-machines/engine'
import { transitionEstimateAction } from '@/actions/estimate'
import { ESTIMATE_TIER_LABEL_MAP } from '@/types/commercial'
import type { Estimate, Proposal } from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import Link from 'next/link'
import {
  ArrowLeftRight,
  FileText,
  DollarSign,
  ClipboardCheck,
  History,
  Activity,
  Calculator,
  Building2,
  Ruler,
  Layers,
  Target,
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type TabId = 'build' | 'summary' | 'qa_review' | 'versions' | 'activity'

interface EstimateDetailProps {
  estimate: Estimate
  auditLog: AuditEntry[]
  linkedProposal?: Proposal | null
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function EstimateDetail({ estimate: initialEstimate, auditLog, linkedProposal }: EstimateDetailProps) {
  const router = useRouter()
  const [estimate, setEstimate] = useState(initialEstimate)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>(
    estimate.status === 'draft' || estimate.status === 'in_build' ? 'build' : 'summary',
  )

  const actorRoles: Role[] = ['estimating']

  const availableTransitions = getAvailableTransitions(
    estimateStateMachine,
    estimate.status,
    actorRoles,
  )

  async function handleStatusChange(targetState: string, reason: string) {
    const result = await transitionEstimateAction({
      estimate_id: estimate.id,
      target_status: targetState,
      reason: reason || undefined,
      approval_granted: true,
    })

    if (result.success && result.data) {
      setEstimate(result.data)
      toast.success(`Status changed to ${ESTIMATE_STATUS_LABELS[result.data.status]}`)
      setStatusModalOpen(false)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to change status')
    }
  }

  const dueDate = estimate.next_action_date
    ? new Date(estimate.next_action_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined

  const currentStatusIndex = ESTIMATE_ACTIVE_STATUSES.indexOf(estimate.status)
  const isEditable = estimate.status === 'draft' || estimate.status === 'in_build'

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'build', label: 'Build', icon: Calculator },
    { id: 'summary', label: 'Summary', icon: DollarSign },
    { id: 'qa_review', label: 'QA Review', icon: ClipboardCheck },
    { id: 'versions', label: 'Versions', icon: History },
    { id: 'activity', label: 'Activity', icon: Activity },
  ]

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* State Ribbon */}
        <StateRibbon
          currentState={estimate.status}
          stateLabel={ESTIMATE_STATUS_LABELS[estimate.status]}
          nextAction={
            estimate.next_action
              ? `${estimate.next_action}${dueDate ? ` (due ${dueDate})` : ''}`
              : undefined
          }
        />

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'build' && (
          <EstimatorBridge
            estimate={estimate}
            onStateSaved={setEstimate}
            readOnly={!isEditable}
          />
        )}

        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Project Details */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Project Details</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem icon={Building2} label="Project Name" value={estimate.project_name} />
                <DetailItem icon={FileText} label="Reference ID" value={estimate.reference_id} mono />
                <DetailItem icon={Building2} label="Client" value={estimate.linked_client_name} />
                <DetailItem icon={Target} label="Build Type" value={estimate.build_type ?? '—'} />
                <DetailItem icon={Ruler} label="Square Footage" value={estimate.square_footage?.toLocaleString() ?? '—'} />
                <DetailItem icon={Layers} label="Stages" value={estimate.stage_count?.toString() ?? '—'} />
                <DetailItem icon={DollarSign} label="Tier" value={estimate.tier_index != null ? ESTIMATE_TIER_LABEL_MAP[estimate.tier_index] ?? '—' : '—'} />
                <DetailItem icon={DollarSign} label="Base Rate" value={formatCurrency(estimate.base_rate)} />
              </div>
            </div>

            {/* Pricing Summary */}
            {estimate.pricing_summary ? (
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Pricing Summary</h2>
                {estimate.pricing_summary.stage_breakdowns.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Stage Breakdowns</h3>
                    {estimate.pricing_summary.stage_breakdowns.map((stage, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border border-border px-4 py-2">
                        <span className="text-sm text-foreground">{stage.stage_name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">{(stage.weight * 100).toFixed(0)}%</span>
                          <span className="text-sm font-medium text-foreground">{formatCurrency(stage.subtotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{formatCurrency(estimate.pricing_summary.subtotal)}</span>
                  </div>
                  {estimate.mobilization_cost?.total != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mobilization</span>
                      <span className="text-foreground">{formatCurrency(estimate.mobilization_cost.total)}</span>
                    </div>
                  )}
                  {estimate.exterior_cost != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Exterior</span>
                      <span className="text-foreground">{formatCurrency(estimate.exterior_cost)}</span>
                    </div>
                  )}
                  {estimate.window_cost != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Windows</span>
                      <span className="text-foreground">{formatCurrency(estimate.window_cost)}</span>
                    </div>
                  )}
                  {estimate.per_diem_cost != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Per Diem</span>
                      <span className="text-foreground">{formatCurrency(estimate.per_diem_cost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Adjustments</span>
                    <span className="text-foreground">{formatCurrency(estimate.pricing_summary.adjustments)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                    <span className="text-foreground">Grand Total</span>
                    <span className="text-primary">{formatCurrency(estimate.pricing_summary.grand_total)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No pricing summary yet. Use the Build tab to create the estimate in the BLU Crew Estimator.
                </p>
              </div>
            )}

            {/* Scope & Assumptions */}
            {(estimate.scope_text || estimate.assumptions || estimate.exclusions) && (
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Scope & Assumptions</h2>
                {estimate.scope_text && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Scope</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{estimate.scope_text}</p>
                  </div>
                )}
                {estimate.assumptions && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Assumptions</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{estimate.assumptions}</p>
                  </div>
                )}
                {estimate.exclusions && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Exclusions</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{estimate.exclusions}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'qa_review' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">QA Review</h2>
            {estimate.status === 'qa_review' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs uppercase text-muted-foreground">Reviewer</span>
                    <p className="text-sm text-foreground">{estimate.qa_reviewer_name ?? estimate.qa_reviewer_id ?? 'Not assigned'}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase text-muted-foreground">Status</span>
                    <p className="text-sm text-foreground">Awaiting review</p>
                  </div>
                </div>
                {estimate.qa_notes && (
                  <div>
                    <span className="text-xs uppercase text-muted-foreground">QA Notes</span>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{estimate.qa_notes}</p>
                  </div>
                )}
              </div>
            ) : estimate.status === 'approved_for_proposal' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Approved for Proposal</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs uppercase text-muted-foreground">Reviewer</span>
                    <p className="text-sm text-foreground">{estimate.qa_reviewer_name ?? estimate.qa_reviewer_id ?? '—'}</p>
                  </div>
                </div>
                {estimate.qa_notes && (
                  <div>
                    <span className="text-xs uppercase text-muted-foreground">QA Notes</span>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{estimate.qa_notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                QA review is available after submitting the estimate from the Build tab.
              </p>
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Version History</h2>
            <div className="flex items-center gap-3 rounded-md border border-border p-3">
              <StatusBadge state={estimate.status} label={ESTIMATE_STATUS_LABELS[estimate.status]} />
              <div>
                <p className="text-sm font-medium text-foreground">Version {estimate.version}</p>
                <p className="text-xs text-muted-foreground">{estimate.reference_id}</p>
              </div>
              {estimate.superseded_by_id && (
                <span className="ml-auto text-xs text-amber-400">
                  Superseded
                </span>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Activity Timeline</h2>
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {auditLog
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {entry.action === 'create' ? 'Estimate created' : entry.action === 'update' ? 'Estimate updated' : entry.action}
                          </span>
                          {entry.action === 'update' && entry.field_changes['status'] && (
                            <StatusBadge
                              state={String(entry.field_changes['status'].to)}
                              label={ESTIMATE_STATUS_LABELS[entry.field_changes['status'].to as EstimateStatus]}
                            />
                          )}
                        </div>
                        {entry.reason && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Reason: {entry.reason}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          {' · '}
                          {entry.actor_id}
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
        {/* Status Progression */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Status Progression
          </h3>
          <div className="space-y-1">
            {ESTIMATE_ACTIVE_STATUSES.map((status, idx) => {
              const isCurrent = status === estimate.status
              const isCompleted = currentStatusIndex >= 0 && idx < currentStatusIndex

              return (
                <div
                  key={status}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs',
                    isCurrent && 'bg-primary/10 font-medium text-primary',
                    isCompleted && 'text-green-400',
                    !isCurrent && !isCompleted && 'text-muted-foreground',
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  ) : isCurrent ? (
                    <Target className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  <span>{ESTIMATE_STATUS_LABELS[status]}</span>
                </div>
              )
            })}
            {estimate.status === 'superseded' && (
              <div className="flex items-center gap-2 rounded-md bg-amber-900/20 px-2 py-1.5 text-xs font-medium text-amber-400">
                <History className="h-3.5 w-3.5" />
                <span>Superseded</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Actions
          </h3>
          {/* Create Proposal — when approved and no proposal exists */}
          {estimate.status === 'approved_for_proposal' && !linkedProposal && (
            <Link
              href={`/proposals/new?estimateId=${estimate.id}`}
              className="flex w-full items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Create Proposal
            </Link>
          )}
          {/* Link to existing proposal */}
          {linkedProposal && (
            <Link
              href={`/proposals/${linkedProposal.id}`}
              className="flex w-full items-center gap-2 rounded-md border border-green-600 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <ArrowRight className="h-4 w-4" />
              View Proposal ({linkedProposal.reference_id})
            </Link>
          )}
          {estimate.status !== 'superseded' && (
            <button
              onClick={() => setStatusModalOpen(true)}
              className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
            >
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              Advance Status
            </button>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        currentState={estimate.status}
        currentStateLabel={ESTIMATE_STATUS_LABELS[estimate.status]}
        availableTransitions={availableTransitions}
        stateLabels={ESTIMATE_STATUS_LABELS}
        onConfirm={handleStatusChange}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DetailItem({
  icon: Icon,
  label,
  value,
  mono,
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
