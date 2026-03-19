'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StateRibbon } from '@/components/shared/state-ribbon'
import { StatusChangeModal } from '@/components/shared/status-change-modal'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  EXPANSION_TASK_STATE_LABELS,
  expansionTaskStateMachine,
  type ExpansionTaskState,
} from '@/lib/state-machines/expansion-task'
import { EXPANSION_TASK_TYPE_LABELS } from '@/types/commercial'
import type { ExpansionTaskType } from '@/types/commercial'
import { getAvailableTransitions } from '@/lib/state-machines/engine'
import { transitionExpansionTaskAction } from '@/actions/expansion-task'
import type { ExpansionTask } from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import {
  ArrowLeftRight,
  FileText,
  Clock,
  Users,
  TrendingUp,
  Zap,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ExpansionTaskDetailProps {
  expansionTask: ExpansionTask
  auditLog: AuditEntry[]
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type Tab = 'overview' | 'growth_actions' | 'signal_link' | 'activity'

export function ExpansionTaskDetail({ expansionTask: initial, auditLog }: ExpansionTaskDetailProps) {
  const router = useRouter()
  const [expansionTask, setExpansionTask] = useState(initial)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const actorRoles: Role[] = ['leadership_system_admin', 'commercial_bd', 'pm_ops']

  const availableTransitions = getAvailableTransitions(
    expansionTaskStateMachine,
    expansionTask.status,
    actorRoles,
  )

  const isTerminal = expansionTask.status === 'complete' || expansionTask.status === 'cancelled'

  async function handleStatusChange(targetState: string, reason: string) {
    const result = await transitionExpansionTaskAction({
      expansion_task_id: expansionTask.id,
      target_status: targetState,
      reason: reason || undefined,
      approval_granted: true,
    })

    if (result.success && result.data) {
      setExpansionTask(result.data)
      toast.success(`Status changed to ${EXPANSION_TASK_STATE_LABELS[result.data.status]}`)
      setStatusModalOpen(false)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to change status')
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'growth_actions', label: 'Growth Actions' },
    { key: 'signal_link', label: 'Signal Link' },
    { key: 'activity', label: 'Activity' },
  ]

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* State Ribbon */}
        <StateRibbon
          currentState={expansionTask.status}
          stateLabel={EXPANSION_TASK_STATE_LABELS[expansionTask.status]}
          nextAction={expansionTask.next_action ?? undefined}
        />

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
              <h2 className="mb-4 text-lg font-semibold text-foreground">Task Details</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem icon={FileText} label="Reference ID" value={expansionTask.reference_id} mono />
                <DetailItem icon={TrendingUp} label="Task Type" value={EXPANSION_TASK_TYPE_LABELS[expansionTask.task_type as ExpansionTaskType] ?? expansionTask.task_type} />
                <DetailItem icon={Clock} label="Due Date" value={formatDate(expansionTask.due_date)} />
                <DetailItem icon={Users} label="Owner" value={expansionTask.owner} />
                <DetailItem icon={Clock} label="Created" value={formatDate(expansionTask.created_at)} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Growth Objective</h2>
              <p className="whitespace-pre-wrap text-sm text-foreground">{expansionTask.growth_objective}</p>
            </div>
          </div>
        )}

        {/* Growth Actions Tab */}
        {activeTab === 'growth_actions' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Growth Action Tracking</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {expansionTask.task_type === 'referral_request' && (
                  <DetailItem icon={Users} label="Referral Status" value={expansionTask.referral_status ?? 'Not started'} />
                )}
                {expansionTask.task_type === 'testimonial_request' && (
                  <DetailItem icon={FileText} label="Testimonial Status" value={expansionTask.testimonial_status ?? 'Not started'} />
                )}
                <DetailItem icon={CheckCircle} label="Completion Outcome" value={expansionTask.completion_outcome ?? 'Pending'} />
              </div>
            </div>
          </div>
        )}

        {/* Signal Link Tab */}
        {activeTab === 'signal_link' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Signal Creation</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Future work becomes a new Project Signal, not a reused Project.
              </p>

              {expansionTask.next_signal_created ? (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <div className="flex items-start gap-2">
                    <Zap className="mt-0.5 h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">Signal Created</p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Linked Signal ID: {expansionTask.next_signal_id ?? 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
                  <Zap className="mx-auto h-8 w-8 text-muted-foreground" />
                  <h3 className="mt-3 text-lg font-semibold text-foreground">No Signal Created</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    When this growth task generates new work, create a Project Signal to track it.
                  </p>
                </div>
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
                            label={EXPANSION_TASK_STATE_LABELS[entry.field_changes['status'].to as ExpansionTaskState]}
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
        </div>
      </div>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        currentState={expansionTask.status}
        currentStateLabel={EXPANSION_TASK_STATE_LABELS[expansionTask.status]}
        availableTransitions={availableTransitions}
        stateLabels={EXPANSION_TASK_STATE_LABELS}
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
