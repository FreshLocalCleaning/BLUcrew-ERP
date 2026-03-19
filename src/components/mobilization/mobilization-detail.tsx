'use client'

import { useState, useCallback } from 'react'
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
import {
  transitionMobilizationAction,
  updateMobilizationFieldsAction,
  updateReadinessChecklistAction,
} from '@/actions/mobilization'
import type {
  Mobilization,
  EquipmentChecklistItem,
  EquipmentStatus,
  ReadinessChecklist,
  LodgingDetails,
  MobilizationTravelPosture,
} from '@/types/commercial'
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
  Pencil,
  X,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Crew members lookup for displaying names
export const CREW_MEMBERS: Record<string, string> = {
  'marcus-johnson': 'Marcus Johnson',
  'tech-001': 'David Rivera',
  'tech-002': 'Sarah Kim',
  'tech-003': 'James Thompson',
  'tech-004': 'Maria Garcia',
  'tech-005': 'Robert Chen',
  'cullen': 'Cullen',
  'antonio': 'Antonio',
}

const ALL_CREW_LEADS = ['marcus-johnson', 'cullen']
const ALL_TECHNICIANS = ['tech-001', 'tech-002', 'tech-003', 'tech-004', 'tech-005']

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

function crewName(id: string): string {
  return CREW_MEMBERS[id] ?? id
}

type Tab = 'planning' | 'readiness' | 'field_reports' | 'qc_completion' | 'activity'

export function MobilizationDetail({ mobilization: initial, auditLog }: MobilizationDetailProps) {
  const router = useRouter()
  const [mobilization, setMobilization] = useState(initial)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('planning')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editCrewLead, setEditCrewLead] = useState(mobilization.crew_lead_id ?? '')
  const [editTechs, setEditTechs] = useState<string[]>(mobilization.named_technicians)
  const [editStartDate, setEditStartDate] = useState(mobilization.requested_start_date ?? '')
  const [editEndDate, setEditEndDate] = useState(mobilization.requested_end_date ?? '')
  const [editSiteAddr, setEditSiteAddr] = useState(mobilization.site_address ?? '')
  const [editAccessPlan, setEditAccessPlan] = useState(mobilization.access_plan ?? '')
  const [editTravelPosture, setEditTravelPosture] = useState<MobilizationTravelPosture>(mobilization.travel_posture)
  const [editVehiclePlan, setEditVehiclePlan] = useState(mobilization.vehicle_plan ?? '')
  const [editPerDiem, setEditPerDiem] = useState(mobilization.per_diem_budget != null ? String(mobilization.per_diem_budget) : '')
  const [editEquipment, setEditEquipment] = useState<EquipmentChecklistItem[]>(mobilization.equipment_checklist)
  const [editLodgingHotel, setEditLodgingHotel] = useState(mobilization.lodging_details?.hotel ?? '')
  const [editLodgingBeds, setEditLodgingBeds] = useState(mobilization.lodging_details?.bed_count ? String(mobilization.lodging_details.bed_count) : '')
  const [editLodgingCheckIn, setEditLodgingCheckIn] = useState(mobilization.lodging_details?.check_in ?? '')
  const [editLodgingCheckOut, setEditLodgingCheckOut] = useState(mobilization.lodging_details?.check_out ?? '')
  const [newEquipItem, setNewEquipItem] = useState('')

  const actorRoles: Role[] = ['leadership_system_admin', 'pm_ops']

  const availableTransitions = getAvailableTransitions(
    mobilizationStateMachine,
    mobilization.status,
    actorRoles,
  )

  const isTerminal = mobilization.status === 'complete' || mobilization.status === 'cancelled'

  function startEditing() {
    setEditCrewLead(mobilization.crew_lead_id ?? '')
    setEditTechs([...mobilization.named_technicians])
    setEditStartDate(mobilization.requested_start_date ?? '')
    setEditEndDate(mobilization.requested_end_date ?? '')
    setEditSiteAddr(mobilization.site_address ?? '')
    setEditAccessPlan(mobilization.access_plan ?? '')
    setEditTravelPosture(mobilization.travel_posture)
    setEditVehiclePlan(mobilization.vehicle_plan ?? '')
    setEditPerDiem(mobilization.per_diem_budget != null ? String(mobilization.per_diem_budget) : '')
    setEditEquipment(mobilization.equipment_checklist.map(e => ({ ...e })))
    setEditLodgingHotel(mobilization.lodging_details?.hotel ?? '')
    setEditLodgingBeds(mobilization.lodging_details?.bed_count ? String(mobilization.lodging_details.bed_count) : '')
    setEditLodgingCheckIn(mobilization.lodging_details?.check_in ?? '')
    setEditLodgingCheckOut(mobilization.lodging_details?.check_out ?? '')
    setNewEquipItem('')
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
  }

  async function saveEdits() {
    setSaving(true)
    const lodging: LodgingDetails | null =
      editTravelPosture === 'overnight' && editLodgingHotel
        ? {
            hotel: editLodgingHotel,
            bed_count: parseInt(editLodgingBeds) || 1,
            confirmation: null,
            check_in: editLodgingCheckIn,
            check_out: editLodgingCheckOut,
          }
        : null

    const result = await updateMobilizationFieldsAction({
      id: mobilization.id,
      crew_lead_id: editCrewLead || null,
      named_technicians: editTechs,
      requested_start_date: editStartDate || null,
      requested_end_date: editEndDate || null,
      site_address: editSiteAddr || null,
      access_plan: editAccessPlan || null,
      travel_posture: editTravelPosture,
      vehicle_plan: editVehiclePlan || null,
      per_diem_budget: editPerDiem ? parseFloat(editPerDiem) : null,
      equipment_checklist: editEquipment,
      lodging_details: lodging,
    })

    if (result.success && result.data) {
      setMobilization(result.data)
      setEditing(false)
      toast.success('Changes saved')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to save changes')
    }
    setSaving(false)
  }

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

  const handleReadinessToggle = useCallback(async (key: keyof ReadinessChecklist) => {
    const newChecklist = { ...mobilization.readiness_checklist, [key]: !mobilization.readiness_checklist[key] }
    const result = await updateReadinessChecklistAction({
      mobilization_id: mobilization.id,
      checklist: newChecklist,
    })
    if (result.success && result.data) {
      setMobilization(result.data)
      toast.success(`${key.replace(/_/g, ' ')} ${newChecklist[key] ? 'completed' : 'unchecked'}`)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to update checklist')
    }
  }, [mobilization, router])

  function toggleTech(techId: string) {
    setEditTechs(prev =>
      prev.includes(techId) ? prev.filter(t => t !== techId) : [...prev, techId]
    )
  }

  function updateEquipStatus(idx: number, status: EquipmentStatus) {
    setEditEquipment(prev => prev.map((item, i) => i === idx ? { ...item, status } : item))
  }

  function addEquipItem() {
    if (!newEquipItem.trim()) return
    setEditEquipment(prev => [...prev, { item: newEquipItem.trim(), status: 'needed', notes: null }])
    setNewEquipItem('')
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'planning', label: 'Planning' },
    { key: 'readiness', label: 'Readiness' },
    { key: 'field_reports', label: 'Field Reports' },
    { key: 'qc_completion', label: 'QC / Completion' },
    { key: 'activity', label: 'Activity' },
  ]

  const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Crew & Schedule</h2>
                {editing && (
                  <span className="text-xs text-amber-500 font-medium">Editing</span>
                )}
              </div>
              {!editing ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailItem icon={Users} label="Crew Lead" value={mobilization.crew_lead_id ? crewName(mobilization.crew_lead_id) : '—'} />
                  <DetailItem icon={Users} label="Technicians" value={mobilization.named_technicians.length > 0 ? mobilization.named_technicians.map(crewName).join(', ') : '—'} />
                  <DetailItem icon={Clock} label="Requested Start" value={formatDate(mobilization.requested_start_date)} />
                  <DetailItem icon={Clock} label="Requested End" value={formatDate(mobilization.requested_end_date)} />
                  <DetailItem icon={Clock} label="Actual Start" value={formatDate(mobilization.actual_start_date)} />
                  <DetailItem icon={Clock} label="Actual End" value={formatDate(mobilization.actual_end_date)} />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Crew Lead</label>
                    <select value={editCrewLead} onChange={e => setEditCrewLead(e.target.value)} className={inputClass}>
                      <option value="">— Unassigned —</option>
                      {ALL_CREW_LEADS.map(id => (
                        <option key={id} value={id}>{crewName(id)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Technicians</label>
                    <div className="space-y-1">
                      {ALL_TECHNICIANS.map(id => (
                        <label key={id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editTechs.includes(id)}
                            onChange={() => toggleTech(id)}
                            className="rounded border-input"
                          />
                          {crewName(id)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Requested Start</label>
                    <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Requested End</label>
                    <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} className={inputClass} />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Travel & Lodging</h2>
              {!editing ? (
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
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Travel Posture</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditTravelPosture('local')}
                        className={cn('flex-1 rounded-md border px-3 py-1.5 text-sm', editTravelPosture === 'local' ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-input text-foreground')}
                      >Local</button>
                      <button
                        onClick={() => setEditTravelPosture('overnight')}
                        className={cn('flex-1 rounded-md border px-3 py-1.5 text-sm', editTravelPosture === 'overnight' ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-input text-foreground')}
                      >Overnight</button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Site Address</label>
                    <input type="text" value={editSiteAddr} onChange={e => setEditSiteAddr(e.target.value)} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Access Plan</label>
                    <textarea value={editAccessPlan} onChange={e => setEditAccessPlan(e.target.value)} rows={2} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Vehicle Plan</label>
                    <input type="text" value={editVehiclePlan} onChange={e => setEditVehiclePlan(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Per Diem Budget ($)</label>
                    <input type="number" value={editPerDiem} onChange={e => setEditPerDiem(e.target.value)} className={inputClass} />
                  </div>
                  {editTravelPosture === 'overnight' && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Hotel Name</label>
                        <input type="text" value={editLodgingHotel} onChange={e => setEditLodgingHotel(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Bed Count</label>
                        <input type="number" value={editLodgingBeds} onChange={e => setEditLodgingBeds(e.target.value)} min={1} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Check-in Date</label>
                        <input type="date" value={editLodgingCheckIn} onChange={e => setEditLodgingCheckIn(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Check-out Date</label>
                        <input type="date" value={editLodgingCheckOut} onChange={e => setEditLodgingCheckOut(e.target.value)} className={inputClass} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Equipment Checklist */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Equipment Checklist</h2>
              {!editing ? (
                mobilization.equipment_checklist.length > 0 ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground">No equipment items listed.</p>
                )
              ) : (
                <div className="space-y-2">
                  {editEquipment.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 rounded border border-border px-3 py-2">
                      <span className="flex-1 text-sm">{item.item}</span>
                      <select
                        value={item.status}
                        onChange={e => updateEquipStatus(i, e.target.value as EquipmentStatus)}
                        className="rounded border border-input bg-background px-2 py-1 text-xs"
                      >
                        <option value="packed">Packed</option>
                        <option value="needed">Needed</option>
                        <option value="rented">Rented</option>
                        <option value="na">N/A</option>
                      </select>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={newEquipItem}
                      onChange={e => setNewEquipItem(e.target.value)}
                      placeholder="Add equipment item..."
                      className={cn(inputClass, 'flex-1')}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEquipItem(); } }}
                    />
                    <button
                      onClick={addEquipItem}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Readiness Tab */}
        {activeTab === 'readiness' && (
          <div className="space-y-6">
            <MobilizationReadinessCard
              checklist={mobilization.readiness_checklist}
              compressedPlanning={mobilization.compressed_planning}
              exceptionFlag={mobilization.exception_flag}
              interactive={!isTerminal}
              onToggle={handleReadinessToggle}
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
                      <span className="text-xs text-muted-foreground">by {crewName(report.submitted_by)}</span>
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
                  <DetailItem icon={Users} label="Reviewer" value={crewName(mobilization.qc_stage_completion.reviewer_id)} />
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
          {!isTerminal && !editing && (
            <button
              onClick={startEditing}
              className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
              Edit
            </button>
          )}
          {editing && (
            <>
              <button
                onClick={saveEdits}
                disabled={saving}
                className="flex w-full items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={cancelEditing}
                className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </>
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
          interactive={!isTerminal}
          onToggle={handleReadinessToggle}
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
