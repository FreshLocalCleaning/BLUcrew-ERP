'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StateRibbon } from '@/components/shared/state-ribbon'
import { StatusChangeModal } from '@/components/shared/status-change-modal'
import { StatusBadge } from '@/components/shared/status-badge'
import { MobilizationReadinessCard } from './mobilization-readiness-card'
import {
  MOBILIZATION_STATE_LABELS,
  mobilizationStateMachine,
  type MobilizationState,
} from '@/lib/state-machines/mobilization'
import { getAvailableTransitions } from '@/lib/state-machines/engine'
import { transitionMobilizationAction } from '@/actions/mobilization'
import type { Mobilization } from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import Link from 'next/link'
import {
  ArrowLeftRight,
  FileText,
  Building2,
  Clock,
  Users,
  Truck,
  MapPin,
  Package,
  ClipboardCheck,
  Camera,
  Shield,
  AlertTriangle,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MobilizationDetailProps {
  mobilization: Mobilization
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

type Tab = 'planning' | 'readiness' | 'field_reports' | 'qc_completion' | 'activity'

export function MobilizationDetail({ mobilization: initial, auditLog }: MobilizationDetailProps) {
  const router = useRouter()
  const [mobilization, setMobilization] = useState(initial)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('planning')

  const actorRoles: Role[] = ['leadership_system_admin', 'pm_ops']

  const availableTransitions = getAvailableTransitions(
    mobilizationStateMachine,
    mobilization.status,
    actorRoles,
  )

  const isTerminal = mobilization.status === 'complete' || mobilization.status === 'cancelled'

  async function handleStatusChange(targetState: string, reason: string) {
    const result = await transitionMobilizationAction({
      mobilization_id: mobilization.id,
      target_status: targetState,
      reason: reason || undefined,
      approval_granted: true,
    })

    if (result.success && result.data) {
      setMobilization(result.data)
      toast.success(`Status changed to ${MOBILIZATION_STATE_LABELS[result.data.status]}`)
      setStatusModalOpen(false)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to change status')
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'planning', label: 'Planning' },
    { key: 'readiness', label: 'Readiness' },
    { key: 'field_reports', label: 'Field Reports' },
    { key: 'qc_completion', label: 'QC / Completion' },
    { key: 'activity', label: 'Activity' },
  ]

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* State Ribbon */}
        <StateRibbon
          currentState={mobilization.status}
          stateLabel={MOBILIZATION_STATE_LABELS[mobilization.status]}
          nextAction={mobilization.next_action ?? undefined}
        />

        {/* Blocker banner */}
        {mobilization.status === 'blocked' && mobilization.blocker_reason && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Blocked</p>
                <p className="text-sm text-red-700 dark:text-red-300">{mobilization.blocker_reason}</p>
                {mobilization.blocker_owner && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">Owner: {mobilization.blocker_owner}</p>
                )}
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

        {/* Planning Tab */}
        {activeTab === 'planning' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Crew & Schedule</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem icon={Users} label="Crew Lead" value={mobilization.crew_lead_id ?? '—'} />
                <DetailItem icon={Users} label="Technicians" value={mobilization.named_technicians.length > 0 ? mobilization.named_technicians.join(', ') : '—'} />
                <DetailItem icon={Clock} label="Requested Start" value={formatDate(mobilization.requested_start_date)} />
                <DetailItem icon={Clock} label="Requested End" value={formatDate(mobilization.requested_end_date)} />
                <DetailItem icon={Clock} label="Actual Start" value={formatDate(mobilization.actual_start_date)} />
                <DetailItem icon={Clock} label="Actual End" value={formatDate(mobilization.actual_end_date)} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Travel & Lodging</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem icon={Truck} label="Travel Posture" value={mobilization.travel_posture === 'local' ? 'Local' : 'Overnight'} />
                <DetailItem icon={MapPin} label="Site Address" value={mobilization.site_address ?? '—'} />
                <DetailItem icon={FileText} label="Access Plan" value={mobilization.access_plan ?? '—'} />
                <DetailItem icon={FileText} label="Vehicle Plan" value={mobilization.vehicle_plan ?? '—'} />
                {mobilization.lodging_details && (
                  <>
                    <DetailItem icon={Building2} label="Hotel" value={mobilization.lodging_details.hotel} />
                    <DetailItem icon={FileText} label="Beds" value={String(mobilization.lodging_details.bed_count)} />
                    <DetailItem icon={Clock} label="Check-in" value={formatDate(mobilization.lodging_details.check_in)} />
                    <DetailItem icon={Clock} label="Check-out" value={formatDate(mobilization.lodging_details.check_out)} />
                  </>
                )}
                {mobilization.per_diem_budget != null && (
                  <DetailItem icon={FileText} label="Per Diem Budget" value={`$${mobilization.per_diem_budget}`} />
                )}
              </div>
            </div>

            {mobilization.equipment_checklist.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Equipment Checklist</h2>
                <div className="space-y-2">
                  {mobilization.equipment_checklist.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded border border-border px-3 py-2">
                      <span className="text-sm">{item.item}</span>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
                        item.status === 'packed' ? 'bg-green-100 text-green-800' :
                        item.status === 'needed' ? 'bg-red-100 text-red-800' :
                        item.status === 'rented' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Readiness Tab */}
        {activeTab === 'readiness' && (
          <div className="space-y-6">
            <MobilizationReadinessCard
              checklist={mobilization.readiness_checklist}
              compressedPlanning={mobilization.compressed_planning}
              exceptionFlag={mobilization.exception_flag}
            />
            {mobilization.missing_items_log && mobilization.missing_items_log.length > 0 && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Missing Items</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-yellow-700 dark:text-yellow-300">
                  {mobilization.missing_items_log.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Field Reports Tab */}
        {activeTab === 'field_reports' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Daily Reports</h2>
            {mobilization.daily_reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No daily reports submitted yet.</p>
            ) : (
              <div className="space-y-4">
                {mobilization.daily_reports.slice().reverse().map((report, i) => (
                  <div key={i} className="rounded border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{formatDate(report.date)}</span>
                      <span className="text-xs text-muted-foreground">by {report.submitted_by}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{report.summary}</p>
                    {report.exceptions && (
                      <p className="mt-1 text-sm text-red-600">Exceptions: {report.exceptions}</p>
                    )}
                    {report.photos.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <Camera className="inline h-3 w-3 mr-1" />
                        {report.photos.length} photo(s)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QC / Completion Tab */}
        {activeTab === 'qc_completion' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Completion Requirements</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem
                  icon={Camera}
                  label="Photo Report"
                  value={mobilization.photo_report_link ? 'Uploaded' : 'Not uploaded'}
                />
                <DetailItem
                  icon={ClipboardCheck}
                  label="Client Sign-off"
                  value={mobilization.client_signoff_status ?? 'Not set'}
                />
                <DetailItem
                  icon={Shield}
                  label="QC Review"
                  value={mobilization.qc_stage_completion ? (mobilization.qc_stage_completion.passed ? 'Passed' : 'Failed') : 'Not completed'}
                />
                <DetailItem
                  icon={FileText}
                  label="Invoice Release"
                  value={mobilization.invoice_release_status ?? 'Not set'}
                />
              </div>
            </div>

            {mobilization.qc_stage_completion && (
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">QC Details</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailItem icon={Shield} label="Result" value={mobilization.qc_stage_completion.passed ? 'Passed' : 'Failed'} />
                  <DetailItem icon={Users} label="Reviewer" value={mobilization.qc_stage_completion.reviewer_id} />
                  <DetailItem icon={Clock} label="Date" value={formatDate(mobilization.qc_stage_completion.date)} />
                </div>
                {mobilization.qc_stage_completion.notes && (
                  <p className="mt-3 text-sm text-foreground">{mobilization.qc_stage_completion.notes}</p>
                )}
              </div>
            )}
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
                            label={MOBILIZATION_STATE_LABELS[entry.field_changes['status'].to as MobilizationState]}
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
          <Link
            href={`/change-orders/new?project=${mobilization.linked_project_id}&mobilization=${mobilization.id}`}
            className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            New Change Order
          </Link>
        </div>

        {/* Readiness card in sidebar */}
        <MobilizationReadinessCard
          checklist={mobilization.readiness_checklist}
          compressedPlanning={mobilization.compressed_planning}
          exceptionFlag={mobilization.exception_flag}
        />
      </div>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        currentState={mobilization.status}
        currentStateLabel={MOBILIZATION_STATE_LABELS[mobilization.status]}
        availableTransitions={availableTransitions}
        stateLabels={MOBILIZATION_STATE_LABELS}
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
