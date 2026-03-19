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
  EquipmentTemplate,
  ReadinessChecklist,
  LodgingDetails,
  MobilizationTravelPosture,
} from '@/types/commercial'
import type { AuditEntry } from '@/lib/db/json-db'
import type { Role } from '@/lib/permissions/roles'
import Link from 'next/link'
import { createEquipmentTemplateAction } from '@/actions/equipment-template'
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
  ChevronDown,
  BookTemplate,
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
  equipmentTemplates?: EquipmentTemplate[]
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

export function MobilizationDetail({ mobilization: initial, auditLog, equipmentTemplates = [] }: MobilizationDetailProps) {
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
  const [expandedEquipIdx, setExpandedEquipIdx] = useState<number | null>(null)
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)
  const [confirmTemplateLoad, setConfirmTemplateLoad] = useState<EquipmentTemplate | null>(null)
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false)
  const [saveTemplateName, setSaveTemplateName] = useState('')
  const [saveTemplateDesc, setSaveTemplateDesc] = useState('')
  const [saveTemplateBuildTypes, setSaveTemplateBuildTypes] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

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

  function updateEquipName(idx: number, name: string) {
    setEditEquipment(prev => prev.map((item, i) => i === idx ? { ...item, item: name } : item))
  }

  function updateEquipNotes(idx: number, notes: string) {
    setEditEquipment(prev => prev.map((item, i) => i === idx ? { ...item, notes: notes || null } : item))
  }

  function removeEquipItem(idx: number) {
    setEditEquipment(prev => prev.filter((_, i) => i !== idx))
    if (expandedEquipIdx === idx) setExpandedEquipIdx(null)
    else if (expandedEquipIdx !== null && expandedEquipIdx > idx) setExpandedEquipIdx(expandedEquipIdx - 1)
  }

  function addEquipItem() {
    if (!newEquipItem.trim()) return
    setEditEquipment(prev => [...prev, { item: newEquipItem.trim(), status: 'needed', notes: null }])
    setNewEquipItem('')
  }

  function handleLoadTemplate(template: EquipmentTemplate) {
    if (editEquipment.length > 0) {
      setConfirmTemplateLoad(template)
    } else {
      applyTemplate(template)
    }
    setTemplateDropdownOpen(false)
  }

  function applyTemplate(template: EquipmentTemplate) {
    const items: EquipmentChecklistItem[] = template.items.map(t => ({
      item: t.item,
      status: t.default_status === 'packed' ? 'packed' : 'needed',
      notes: t.notes,
    }))
    setEditEquipment(items)
    setConfirmTemplateLoad(null)
    toast.success(`Loaded template: ${template.name}`)
  }

  async function handleSaveAsTemplate() {
    if (!saveTemplateName.trim()) {
      toast.error('Template name is required')
      return
    }
    setSavingTemplate(true)
    const currentItems = editing ? editEquipment : mobilization.equipment_checklist
    const result = await createEquipmentTemplateAction({
      name: saveTemplateName.trim(),
      description: saveTemplateDesc.trim(),
      items: currentItems.map(item => ({
        item: item.item,
        default_status: item.status === 'packed' ? 'packed' as const : 'needed' as const,
        notes: item.notes,
      })),
      build_types: saveTemplateBuildTypes.trim()
        ? saveTemplateBuildTypes.split(',').map(s => s.trim()).filter(Boolean)
        : [],
    })
    if (result.success) {
      toast.success(`Template "${saveTemplateName}" saved`)
      setSaveTemplateModalOpen(false)
      setSaveTemplateName('')
      setSaveTemplateDesc('')
      setSaveTemplateBuildTypes('')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to save template')
    }
    setSavingTemplate(false)
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Equipment Checklist</h2>
                <div className="flex items-center gap-2">
                  {/* Load Template dropdown */}
                  {editing && equipmentTemplates.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
                        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50"
                      >
                        <BookTemplate className="h-3.5 w-3.5" />
                        Load Template
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {templateDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setTemplateDropdownOpen(false)} />
                          <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-md border border-border bg-card shadow-lg">
                            <div className="max-h-64 overflow-y-auto p-1">
                              {equipmentTemplates.map(t => (
                                <button
                                  key={t.id}
                                  onClick={() => handleLoadTemplate(t)}
                                  className="flex w-full flex-col items-start rounded px-3 py-2 text-left hover:bg-muted/50"
                                >
                                  <span className="text-sm font-medium text-foreground">{t.name}</span>
                                  <span className="text-xs text-muted-foreground">{t.items.length} items{t.build_types.length > 0 ? ` · ${t.build_types.slice(0, 2).join(', ')}` : ''}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {/* Save as Template */}
                  {(editing ? editEquipment.length > 0 : mobilization.equipment_checklist.length > 0) && (
                    <button
                      type="button"
                      onClick={() => setSaveTemplateModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save as Template
                    </button>
                  )}
                </div>
              </div>
              {!editing ? (
                mobilization.equipment_checklist.length > 0 ? (
                  <div className="space-y-2">
                    {mobilization.equipment_checklist.map((item, i) => (
                      <div key={i} className="rounded border border-border">
                        <div className="flex items-center justify-between px-3 py-2">
                          <div className="flex-1">
                            <span className="text-sm">{item.item}</span>
                            {item.notes && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{item.notes}</p>
                            )}
                          </div>
                          <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
                            item.status === 'packed' ? 'bg-green-100 text-green-800' :
                            item.status === 'needed' ? 'bg-red-100 text-red-800' :
                            item.status === 'rented' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No equipment items listed.</p>
                )
              ) : (
                <div className="space-y-2">
                  {editEquipment.map((item, i) => {
                    const isExpanded = expandedEquipIdx === i
                    return (
                      <div key={i} className="rounded border border-border">
                        <div className="flex items-center gap-2 px-3 py-2">
                          {/* Expand/collapse toggle */}
                          <button
                            type="button"
                            onClick={() => setExpandedEquipIdx(isExpanded ? null : i)}
                            className="shrink-0 text-muted-foreground hover:text-foreground text-xs"
                            title={isExpanded ? 'Collapse' : 'Expand for notes'}
                          >
                            {isExpanded ? '▾' : '▸'}
                          </button>
                          {/* Editable item name */}
                          <input
                            type="text"
                            value={item.item}
                            onChange={e => updateEquipName(i, e.target.value)}
                            className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-foreground hover:border-input focus:border-input focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          {/* Status dropdown */}
                          <select
                            value={item.status}
                            onChange={e => updateEquipStatus(i, e.target.value as EquipmentStatus)}
                            className={cn(
                              'rounded border px-2 py-1 text-xs font-medium',
                              item.status === 'packed' ? 'border-green-300 bg-green-50 text-green-800' :
                              item.status === 'needed' ? 'border-red-300 bg-red-50 text-red-800' :
                              item.status === 'rented' ? 'border-blue-300 bg-blue-50 text-blue-800' :
                              'border-gray-300 bg-gray-50 text-gray-800'
                            )}
                          >
                            <option value="packed">Packed</option>
                            <option value="needed">Needed</option>
                            <option value="rented">Rented</option>
                            <option value="na">N/A</option>
                          </select>
                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => removeEquipItem(i)}
                            className="shrink-0 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                            title="Remove item"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Expandable notes */}
                        {isExpanded && (
                          <div className="border-t border-border px-3 py-2">
                            <label className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Notes</label>
                            <textarea
                              value={item.notes ?? ''}
                              onChange={e => updateEquipNotes(i, e.target.value)}
                              placeholder="Add notes for this item..."
                              rows={2}
                              className={cn(inputClass, 'text-xs')}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
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
                      disabled={!newEquipItem.trim()}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium',
                        newEquipItem.trim()
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      )}
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

      {/* Confirm Template Load Modal */}
      {confirmTemplateLoad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmTemplateLoad(null)} />
          <div className="relative w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">Replace current checklist?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will replace {editEquipment.length} existing item{editEquipment.length !== 1 ? 's' : ''} with
              the <strong>{confirmTemplateLoad.name}</strong> template ({confirmTemplateLoad.items.length} items).
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setConfirmTemplateLoad(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={() => applyTemplate(confirmTemplateLoad)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save as Template Modal */}
      {saveTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSaveTemplateModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">Save as Equipment Template</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Save the current {(editing ? editEquipment : mobilization.equipment_checklist).length} item{(editing ? editEquipment : mobilization.equipment_checklist).length !== 1 ? 's' : ''} as a reusable template.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Template Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={saveTemplateName}
                  onChange={e => setSaveTemplateName(e.target.value)}
                  placeholder="e.g. Hospital Deep Clean"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={saveTemplateDesc}
                  onChange={e => setSaveTemplateDesc(e.target.value)}
                  placeholder="What type of job is this template for?"
                  rows={2}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Build Types</label>
                <input
                  type="text"
                  value={saveTemplateBuildTypes}
                  onChange={e => setSaveTemplateBuildTypes(e.target.value)}
                  placeholder="Comma-separated: office_buildout, retail, gym"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-muted-foreground">Optional. Helps filter templates by project type.</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSaveTemplateModalOpen(false)
                  setSaveTemplateName('')
                  setSaveTemplateDesc('')
                  setSaveTemplateBuildTypes('')
                }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={savingTemplate || !saveTemplateName.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

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
