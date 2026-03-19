'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StateRibbon } from '@/components/shared/state-ribbon'
import { StatusChangeModal } from '@/components/shared/status-change-modal'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  PROJECT_STATE_LABELS,
  projectStateMachine,
  type ProjectState,
} from '@/lib/state-machines/project'
import { getAvailableTransitions } from '@/lib/state-machines/engine'
import { transitionProjectAction } from '@/actions/project'
import type { Project, Mobilization } from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import Link from 'next/link'
import {
  MOBILIZATION_STATE_LABELS,
} from '@/lib/state-machines/mobilization'
import type { MobilizationState } from '@/lib/state-machines/mobilization'
import {
  ArrowLeftRight,
  FileText,
  DollarSign,
  Building2,
  Clock,
  Users,
  Truck,
  Receipt,
  ClipboardCheck,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProjectDetailProps {
  project: Project
  auditLog: AuditEntry[]
  mobilizations?: Mobilization[]
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

type Tab = 'overview' | 'mobilizations' | 'change_orders' | 'baseline' | 'financials' | 'closeout' | 'activity'

export function ProjectDetail({ project: initial, auditLog, mobilizations = [] }: ProjectDetailProps) {
  const router = useRouter()
  const [project, setProject] = useState(initial)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const actorRoles: Role[] = ['leadership_system_admin', 'pm_ops']

  const availableTransitions = getAvailableTransitions(
    projectStateMachine,
    project.status,
    actorRoles,
  )

  const isTerminal = project.status === 'financially_closed'

  async function handleStatusChange(targetState: string, reason: string) {
    const result = await transitionProjectAction({
      project_id: project.id,
      target_status: targetState,
      reason: reason || undefined,
      approval_granted: true,
    })

    if (result.success && result.data) {
      setProject(result.data)
      toast.success(`Status changed to ${PROJECT_STATE_LABELS[result.data.status]}`)
      setStatusModalOpen(false)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to change status')
    }
  }

  const snapshot = project.commercial_baseline_snapshot

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'mobilizations', label: 'Mobilizations' },
    { key: 'change_orders', label: 'Change Orders' },
    { key: 'baseline', label: 'Commercial Baseline' },
    { key: 'financials', label: 'Financials' },
    { key: 'closeout', label: 'Closeout' },
    { key: 'activity', label: 'Activity' },
  ]

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* State Ribbon */}
        <StateRibbon
          currentState={project.status}
          stateLabel={PROJECT_STATE_LABELS[project.status]}
          nextAction={project.next_action ?? undefined}
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

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Project Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem icon={Building2} label="Project Name" value={project.project_name} />
              <DetailItem icon={FileText} label="Reference ID" value={project.reference_id} mono />
              <DetailItem icon={Users} label="PM Owner" value={project.pm_owner_id} />
              <DetailItem icon={Clock} label="Target Turnover" value={formatDate(project.target_turnover_date)} />
              <DetailItem icon={DollarSign} label="Proposal Value" value={formatCurrency(snapshot?.proposal_value as number)} />
              <DetailItem icon={FileText} label="Change Orders" value={String(project.active_change_order_count)} />
              <DetailItem icon={Clock} label="Created" value={formatDate(project.created_at)} />
            </div>
          </div>
        )}

        {activeTab === 'mobilizations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Mobilizations ({mobilizations.length})
              </h2>
              {(project.status === 'forecasting_active' || project.status === 'execution_active') && (
                <Link
                  href={`/mobilizations/new?project=${project.id}`}
                  className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  New Mobilization
                </Link>
              )}
            </div>

            {mobilizations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
                <Truck className="mx-auto h-8 w-8 text-muted-foreground" />
                <h3 className="mt-3 text-lg font-semibold text-foreground">No Mobilizations</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a mobilization to begin planning trips for this project.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mobilizations.map((mob) => {
                  const gateFields = [
                    mob.readiness_checklist.crew_confirmed,
                    mob.readiness_checklist.equipment_loaded,
                    mob.readiness_checklist.travel_booked,
                    mob.readiness_checklist.lodging_booked,
                    mob.readiness_checklist.per_diem_approved,
                  ]
                  const readinessPct = Math.round(
                    (gateFields.filter(Boolean).length / gateFields.length) * 100,
                  )
                  return (
                    <Link
                      key={mob.id}
                      href={`/mobilizations/${mob.id}`}
                      className="block rounded-lg border border-border bg-card p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-primary">{mob.reference_id}</span>
                          <span className="text-sm font-medium text-foreground">{mob.stage_name}</span>
                        </div>
                        <StatusBadge
                          state={mob.status}
                          label={MOBILIZATION_STATE_LABELS[mob.status]}
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Lead: {mob.crew_lead_id ?? '—'}</span>
                        <span>Start: {mob.requested_start_date ? formatDate(mob.requested_start_date) : '—'}</span>
                        <div className="flex items-center gap-1">
                          <span>Readiness:</span>
                          <div className="h-1.5 w-12 rounded-full bg-muted">
                            <div
                              className={`h-1.5 rounded-full ${readinessPct === 100 ? 'bg-green-500' : readinessPct > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${readinessPct}%` }}
                            />
                          </div>
                          <span>{readinessPct}%</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'change_orders' && (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-semibold text-foreground">Change Orders</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Change Order management will be built in Sprint 6.
            </p>
          </div>
        )}

        {activeTab === 'baseline' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Commercial Baseline</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Read-only snapshot of the accepted commercial terms. Changes require a Change Order.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem icon={FileText} label="Build Type" value={String(snapshot?.build_type ?? '—')} />
              <DetailItem icon={FileText} label="Square Footage" value={snapshot?.square_footage ? `${Number(snapshot.square_footage).toLocaleString()} SF` : '—'} />
              <DetailItem icon={DollarSign} label="Proposal Value" value={formatCurrency(snapshot?.proposal_value as number)} />
              <DetailItem icon={FileText} label="Stages" value={String(snapshot?.stage_count ?? '—')} />
            </div>
            {snapshot?.scope_text && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">Scope</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{String(snapshot.scope_text)}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-semibold text-foreground">Financials</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Billing, invoicing, and AR tracking will be built in a later sprint.
            </p>
          </div>
        )}

        {activeTab === 'closeout' && (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-semibold text-foreground">Closeout</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Closeout checklist will be built in a later sprint.
            </p>
          </div>
        )}

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
                            label={PROJECT_STATE_LABELS[entry.field_changes['status'].to as ProjectState]}
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
        currentState={project.status}
        currentStateLabel={PROJECT_STATE_LABELS[project.status]}
        availableTransitions={availableTransitions}
        stateLabels={PROJECT_STATE_LABELS}
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
