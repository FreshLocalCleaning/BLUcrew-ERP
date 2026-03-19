import { z } from 'zod/v4'
import { MOBILIZATION_STATES } from '@/lib/state-machines/mobilization'

// ---------------------------------------------------------------------------
// Enum Zod types
// ---------------------------------------------------------------------------

export const MobilizationStateEnum = z.enum(MOBILIZATION_STATES as unknown as [string, ...string[]])

const TravelPostureEnum = z.enum(['local', 'overnight'])
const EquipmentStatusEnum = z.enum(['packed', 'needed', 'rented', 'na'])
const ClientSignoffStatusEnum = z.enum(['pending', 'obtained', 'disputed'])
const InvoiceReleaseStatusEnum = z.enum(['not_ready', 'staged', 'released'])

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const lodgingDetailsSchema = z.object({
  hotel: z.string().min(1),
  bed_count: z.number().int().min(1),
  confirmation: z.string().nullable().default(null),
  check_in: z.string().min(1),
  check_out: z.string().min(1),
})

const equipmentItemSchema = z.object({
  item: z.string().min(1),
  status: EquipmentStatusEnum,
  notes: z.string().nullable().default(null),
})

const readinessChecklistSchema = z.object({
  crew_confirmed: z.boolean().default(false),
  equipment_loaded: z.boolean().default(false),
  travel_booked: z.boolean().default(false),
  lodging_booked: z.boolean().default(false),
  per_diem_approved: z.boolean().default(false),
  jobber_synced: z.boolean().default(false),
  teams_posted: z.boolean().default(false),
})

const dailyReportSchema = z.object({
  date: z.string().min(1),
  summary: z.string().min(1),
  photos: z.array(z.string()).default([]),
  exceptions: z.string().nullable().default(null),
  submitted_by: z.string().min(1),
})

const qcStageCompletionSchema = z.object({
  passed: z.boolean(),
  reviewer_id: z.string().min(1),
  date: z.string().min(1),
  notes: z.string(),
})

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

export const createMobilizationSchema = z.object({
  linked_project_id: z.string().min(1, 'Project ID is required'),
  linked_client_id: z.string().min(1, 'Client ID is required'),
  stage_name: z.string().min(1, 'Stage name is required').max(200),
  crew_lead_id: z.string().nullable().default(null),
  named_technicians: z.array(z.string()).default([]),
  requested_start_date: z.string().nullable().default(null),
  requested_end_date: z.string().nullable().default(null),
  actual_start_date: z.string().nullable().default(null),
  actual_end_date: z.string().nullable().default(null),
  site_address: z.string().nullable().default(null),
  access_plan: z.string().nullable().default(null),
  travel_posture: TravelPostureEnum.default('local'),
  lodging_details: lodgingDetailsSchema.nullable().default(null),
  per_diem_budget: z.number().nullable().default(null),
  equipment_checklist: z.array(equipmentItemSchema).default([]),
  vehicle_plan: z.string().nullable().default(null),
  readiness_checklist: readinessChecklistSchema.default({
    crew_confirmed: false,
    equipment_loaded: false,
    travel_booked: false,
    lodging_booked: false,
    per_diem_approved: false,
    jobber_synced: false,
    teams_posted: false,
  }),
  compressed_planning: z.boolean().default(false),
  daily_reports: z.array(dailyReportSchema).default([]),
  photo_report_link: z.string().nullable().default(null),
  client_signoff_status: ClientSignoffStatusEnum.nullable().default(null),
  qc_stage_completion: qcStageCompletionSchema.nullable().default(null),
  invoice_release_status: InvoiceReleaseStatusEnum.nullable().default(null),
  blocker_reason: z.string().nullable().default(null),
  blocker_owner: z.string().nullable().default(null),
  missing_items_log: z.array(z.string()).nullable().default(null),
  actuals_notes: z.string().nullable().default(null),
})

export type CreateMobilizationInput = z.infer<typeof createMobilizationSchema>

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updateMobilizationSchema = z.object({
  id: z.string().min(1, 'Mobilization ID is required'),
  stage_name: z.string().min(1).max(200).optional(),
  crew_lead_id: z.string().nullable().optional(),
  named_technicians: z.array(z.string()).optional(),
  requested_start_date: z.string().nullable().optional(),
  requested_end_date: z.string().nullable().optional(),
  actual_start_date: z.string().nullable().optional(),
  actual_end_date: z.string().nullable().optional(),
  site_address: z.string().nullable().optional(),
  access_plan: z.string().nullable().optional(),
  travel_posture: TravelPostureEnum.optional(),
  lodging_details: lodgingDetailsSchema.nullable().optional(),
  per_diem_budget: z.number().nullable().optional(),
  equipment_checklist: z.array(equipmentItemSchema).optional(),
  vehicle_plan: z.string().nullable().optional(),
  readiness_checklist: readinessChecklistSchema.optional(),
  compressed_planning: z.boolean().optional(),
  photo_report_link: z.string().nullable().optional(),
  client_signoff_status: ClientSignoffStatusEnum.nullable().optional(),
  qc_stage_completion: qcStageCompletionSchema.nullable().optional(),
  invoice_release_status: InvoiceReleaseStatusEnum.nullable().optional(),
  blocker_reason: z.string().nullable().optional(),
  blocker_owner: z.string().nullable().optional(),
  missing_items_log: z.array(z.string()).nullable().optional(),
  actuals_notes: z.string().nullable().optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: z.string().optional(),
})

export type UpdateMobilizationInput = z.infer<typeof updateMobilizationSchema>

// ---------------------------------------------------------------------------
// Transition Schema
// ---------------------------------------------------------------------------

export const mobilizationTransitionSchema = z.object({
  mobilization_id: z.string().min(1),
  target_status: MobilizationStateEnum,
  reason: z.string().max(2000).optional(),
  approval_granted: z.boolean().optional(),
})

export type MobilizationTransitionInput = z.infer<typeof mobilizationTransitionSchema>

// ---------------------------------------------------------------------------
// Daily Report Schema (for addDailyReport action)
// ---------------------------------------------------------------------------

export const addDailyReportSchema = z.object({
  mobilization_id: z.string().min(1),
  date: z.string().min(1),
  summary: z.string().min(1),
  photos: z.array(z.string()).default([]),
  exceptions: z.string().nullable().default(null),
})

export type AddDailyReportInput = z.infer<typeof addDailyReportSchema>

// ---------------------------------------------------------------------------
// Readiness Checklist Update Schema
// ---------------------------------------------------------------------------

export const updateReadinessChecklistSchema = z.object({
  mobilization_id: z.string().min(1),
  checklist: readinessChecklistSchema,
})

export type UpdateReadinessChecklistInput = z.infer<typeof updateReadinessChecklistSchema>

// ---------------------------------------------------------------------------
// Compressed Planning Override Schema
// ---------------------------------------------------------------------------

export const compressedPlanningOverrideSchema = z.object({
  mobilization_id: z.string().min(1),
  reason: z.string().min(1, 'Reason is required for compressed planning override'),
})

export type CompressedPlanningOverrideInput = z.infer<typeof compressedPlanningOverrideSchema>
