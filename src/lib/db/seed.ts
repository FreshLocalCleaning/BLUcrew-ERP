/**
 * Seed script — populates the JSON DB with sample data.
 * Run with: npx tsx src/lib/db/seed.ts
 */

import * as db from './json-db'
import type { Client, Contact, Pursuit, ProjectSignal, ProjectSignalType, Estimate, Proposal, EstimatePricingSummary, AwardHandoff, ComplianceDocItem, StartupBlockerItem, Project, Mobilization, ReadinessChecklist, EquipmentChecklistItem, ChangeOrder, PricingDelta, ExpansionTask } from '@/types/commercial'
import type { ClientState } from '@/lib/state-machines/client'
import type { ProjectSignalState } from '@/lib/state-machines/project-signal'
import type { PursuitStage } from '@/lib/state-machines/pursuit'
import type { EstimateStatus } from '@/lib/state-machines/estimate'
import type { ProposalStatus } from '@/lib/state-machines/proposal'
import type { AwardHandoffState } from '@/lib/state-machines/award-handoff'
import type { ProjectState } from '@/lib/state-machines/project'
import type { MobilizationState } from '@/lib/state-machines/mobilization'
import type { ChangeOrderState } from '@/lib/state-machines/change-order'
import type { ExpansionTaskState } from '@/lib/state-machines/expansion-task'

// ---------------------------------------------------------------------------
// Client seeds
// ---------------------------------------------------------------------------

interface SeedClient {
  name: string
  tier: 'A' | 'B' | 'C'
  status: ClientState
  market: Client['market']
  vertical: Client['vertical']
  relationship_strength: Client['relationship_strength']
  preferred_provider_candidate?: boolean
  owner: string
  next_action?: string
  next_action_date?: string
  bd_owner_name?: string
  notes?: string
}

const SEED_CLIENTS: SeedClient[] = [
  {
    name: 'Summit Peak Builders',
    tier: 'A',
    status: 'active_client',
    market: 'dallas_fort_worth',
    vertical: 'general_contractor',
    relationship_strength: 'active',
    owner: 'marcus-johnson',
    next_action: 'Quarterly review meeting',
    next_action_date: '2026-04-15',
    bd_owner_name: 'Marcus Johnson',
    notes: 'Long-standing GC partner. 3 active projects in DFW metro.',
  },
  {
    name: 'HBA Design Build',
    tier: 'A',
    status: 'target_client',
    market: 'dallas_fort_worth',
    vertical: 'general_contractor',
    relationship_strength: 'developing',
    owner: 'sarah-chen',
    next_action: 'Send capabilities deck',
    next_action_date: '2026-03-25',
    bd_owner_name: 'Sarah Chen',
    notes: 'Met at AGC event. Strong pipeline in mixed-use projects.',
  },
  {
    name: 'Balfour Beatty',
    tier: 'B',
    status: 'developing_relationship',
    market: 'north_texas',
    vertical: 'general_contractor',
    relationship_strength: 'developing',
    owner: 'marcus-johnson',
    next_action: 'Follow up on bid invitation',
    next_action_date: '2026-03-28',
    bd_owner_name: 'Marcus Johnson',
    notes: 'National GC with regional office. Working toward first project.',
  },
  {
    name: 'Austin Commercial',
    tier: 'B',
    status: 'watchlist',
    market: 'austin',
    vertical: 'general_contractor',
    relationship_strength: 'cold',
    owner: 'sarah-chen',
    next_action: 'Research recent project wins',
    next_action_date: '2026-04-01',
    bd_owner_name: 'Sarah Chen',
    notes: 'Austin market entry target. Large healthcare portfolio.',
  },
  {
    name: 'Rogers-O\'Brien',
    tier: 'A',
    status: 'active_client',
    market: 'dallas_fort_worth',
    vertical: 'general_contractor',
    relationship_strength: 'trusted',
    preferred_provider_candidate: true,
    owner: 'marcus-johnson',
    next_action: 'Strategic partnership review',
    next_action_date: '2026-04-10',
    bd_owner_name: 'Marcus Johnson',
    notes: 'Preferred partner. Multiple ongoing projects. Key relationship for DFW growth.',
  },
  {
    name: 'Whiting-Turner',
    tier: 'C',
    status: 'dormant',
    market: 'houston',
    vertical: 'general_contractor',
    relationship_strength: 'cold',
    owner: 'sarah-chen',
    next_action: 'Re-evaluate Houston market entry',
    next_action_date: '2026-06-01',
    bd_owner_name: 'Sarah Chen',
    notes: 'Paused engagement pending Houston market analysis.',
  },
]

export function seedClients(): void {
  const existing = db.list('clients')
  if (existing.length > 0) {
    return // Already seeded
  }

  for (let i = 0; i < SEED_CLIENTS.length; i++) {
    const seed = SEED_CLIENTS[i]!
    const refNum = String(i + 1).padStart(4, '0')

    db.create<Client>(
      'clients',
      {
        reference_id: `CLT-${refNum}`,
        name: seed.name,
        tier: seed.tier,
        status: seed.status,
        market: seed.market,
        vertical: seed.vertical,
        relationship_strength: seed.relationship_strength,
        preferred_provider_candidate: seed.preferred_provider_candidate ?? false,
        owner: seed.owner,
        next_action: seed.next_action ?? null,
        next_action_date: seed.next_action_date ?? null,
        bd_owner_name: seed.bd_owner_name,
        notes: seed.notes,
        contacts: [],
      } as any,
      'system-seed',
    )
  }
}

// ---------------------------------------------------------------------------
// Contact seeds
// ---------------------------------------------------------------------------

interface SeedContact {
  first_name: string
  last_name: string
  title: string
  client_name: string // matched to client by name
  layer: Contact['layer']
  role_type: string
  influence: Contact['influence']
  relationship_strength: Contact['relationship_strength']
  source_channel: Contact['source_channel']
  is_champion: boolean
  champion_reason?: string
  email: string
  phone?: string
  next_step?: string
  last_touch_date: string
  touch_count: number
  notes?: string
  owner_name?: string
}

const SEED_CONTACTS: SeedContact[] = [
  {
    first_name: 'Megan',
    last_name: 'Torres',
    title: 'Project Manager',
    client_name: 'Summit Peak Builders',
    layer: 'pm_super_field',
    role_type: 'PM',
    influence: 'high',
    relationship_strength: 'trusted',
    source_channel: 'trailer_visit',
    is_champion: true,
    champion_reason: 'Actively recommends BLU Crew to other PMs and project teams.',
    email: 'megan.torres@summitpeak.com',
    phone: '214-555-0101',
    next_step: 'Lunch meeting to discuss upcoming hospital project',
    last_touch_date: '2026-03-14',
    touch_count: 24,
    notes: 'Key champion. Has awarded us 3 projects in the last year.',
    owner_name: 'Antonio',
  },
  {
    first_name: 'Chris',
    last_name: 'Dalton',
    title: 'Superintendent',
    client_name: 'Summit Peak Builders',
    layer: 'pm_super_field',
    role_type: 'Super',
    influence: 'medium',
    relationship_strength: 'active',
    source_channel: 'project_handoff',
    is_champion: false,
    email: 'chris.dalton@summitpeak.com',
    phone: '214-555-0102',
    next_step: 'Site walk on Main St project',
    last_touch_date: '2026-03-10',
    touch_count: 12,
    notes: 'Good working relationship. Prefers text for scheduling.',
    owner_name: 'Antonio',
  },
  {
    first_name: 'Rachel',
    last_name: 'Kim',
    title: 'VP of Operations',
    client_name: 'Rogers-O\'Brien',
    layer: 'exec_owner_rep',
    role_type: 'VP',
    influence: 'high',
    relationship_strength: 'developing',
    source_channel: 'event',
    is_champion: false,
    email: 'rachel.kim@roconnell.com',
    next_step: 'Schedule intro with CEO',
    last_touch_date: '2026-03-05',
    touch_count: 4,
    notes: 'Met at DFW Construction Summit. Interested in our quality process.',
    owner_name: 'Antonio',
  },
  {
    first_name: 'Jake',
    last_name: 'Moreno',
    title: 'Senior Project Manager',
    client_name: 'Rogers-O\'Brien',
    layer: 'pm_super_field',
    role_type: 'Senior PM',
    influence: 'high',
    relationship_strength: 'trusted',
    source_channel: 'repeat_client',
    is_champion: true,
    champion_reason: 'Insisted on BLU Crew for 3 consecutive projects. Internal advocate.',
    email: 'jake.moreno@roconnell.com',
    phone: '214-555-0201',
    next_step: 'Review scope for Uptown tower project',
    last_touch_date: '2026-03-12',
    touch_count: 31,
    notes: 'Strongest champion at ROC. Always requests us by name.',
    owner_name: 'Antonio',
  },
  {
    first_name: 'David',
    last_name: 'Park',
    title: 'Preconstruction Manager',
    client_name: 'Balfour Beatty',
    layer: 'pm_super_field',
    role_type: 'Precon',
    influence: 'medium',
    relationship_strength: 'developing',
    source_channel: 'cold_outreach',
    is_champion: false,
    email: 'david.park@balfourbeatty.com',
    next_step: 'Send updated pricing template',
    last_touch_date: '2026-03-08',
    touch_count: 6,
    notes: 'Responsive to emails. Interested in our estimating approach.',
    owner_name: 'Antonio',
  },
  {
    first_name: 'Lisa',
    last_name: 'Chen',
    title: 'Project Coordinator',
    client_name: 'Balfour Beatty',
    layer: 'coordinator_admin',
    role_type: 'Coordinator',
    influence: 'low',
    relationship_strength: 'new',
    source_channel: 'referral',
    is_champion: false,
    email: 'lisa.chen@balfourbeatty.com',
    next_step: 'Add to newsletter distribution',
    last_touch_date: '2026-03-01',
    touch_count: 2,
    notes: 'Referred by David Park. Handles scheduling and compliance docs.',
    owner_name: 'Cullen',
  },
  {
    first_name: 'Tom',
    last_name: 'Rivera',
    title: 'Director of Construction',
    client_name: 'HBA Design Build',
    layer: 'exec_owner_rep',
    role_type: 'Director',
    influence: 'high',
    relationship_strength: 'new',
    source_channel: 'event',
    is_champion: false,
    email: 'tom.rivera@hbadesignbuild.com',
    phone: '214-555-0301',
    next_step: 'Send capabilities deck and case studies',
    last_touch_date: '2026-03-15',
    touch_count: 1,
    notes: 'First contact at AGC event. Expressed interest in post-construction services.',
    owner_name: 'Antonio',
  },
  {
    first_name: 'Maria',
    last_name: 'Santos',
    title: 'Accounts Payable Manager',
    client_name: 'Rogers-O\'Brien',
    layer: 'coordinator_admin',
    role_type: 'AP',
    influence: 'low',
    relationship_strength: 'active',
    source_channel: 'project_handoff',
    is_champion: false,
    email: 'maria.santos@roconnell.com',
    next_step: 'Verify updated W-9 received',
    last_touch_date: '2026-03-11',
    touch_count: 8,
    notes: 'Handles all invoicing and payment. Quick to respond.',
    owner_name: 'Cullen',
  },
]

export function seedContacts(): void {
  const existingContacts = db.list('contacts')
  if (existingContacts.length > 0) {
    return // Already seeded
  }

  // Ensure clients exist first
  seedClients()

  // Build client lookup by name
  const clients = db.list<Client>('clients')
  const clientByName = new Map(clients.map((c) => [c.name, c]))

  for (let i = 0; i < SEED_CONTACTS.length; i++) {
    const seed = SEED_CONTACTS[i]!
    const refNum = String(i + 1).padStart(4, '0')
    const client = clientByName.get(seed.client_name)

    if (!client) continue

    const contact = db.create<Contact>(
      'contacts',
      {
        reference_id: `CON-${refNum}`,
        first_name: seed.first_name,
        last_name: seed.last_name,
        title: seed.title,
        company: seed.client_name,
        client_id: client.id,
        client_name: seed.client_name,
        layer: seed.layer,
        role_type: seed.role_type,
        influence: seed.influence,
        is_champion: seed.is_champion,
        champion_reason: seed.champion_reason,
        email: seed.email,
        phone: seed.phone,
        relationship_strength: seed.relationship_strength,
        source_channel: seed.source_channel,
        next_step: seed.next_step,
        last_touch_date: seed.last_touch_date,
        touch_count: seed.touch_count,
        notes: seed.notes,
        owner_name: seed.owner_name,
        owner: client.owner ?? 'system-seed',
      } as any,
      'system-seed',
    )

    // Update client's contacts array
    db.update<Client>(
      'clients',
      client.id,
      { contacts: [...client.contacts, contact.id] },
      'system-seed',
    )
    // Also update in-memory for subsequent contacts on same client
    client.contacts.push(contact.id)
  }
}

// ---------------------------------------------------------------------------
// Pursuit seeds (CORE-02)
// ---------------------------------------------------------------------------

interface SeedPursuit {
  project_name: string
  client_name: string // matched to client by name
  primary_contact_name?: string
  stage: PursuitStage
  signal_type: Pursuit['signal_type']
  client_type: Pursuit['client_type']
  build_type: Pursuit['build_type']
  location: string
  approx_sqft: number
  next_action?: string
  next_action_date?: string
  notes?: string
}

const SEED_PURSUITS: SeedPursuit[] = [
  {
    project_name: 'Crunch Fitness Lewisville',
    client_name: 'Summit Peak Builders',
    primary_contact_name: 'Megan Torres',
    stage: 'estimate_ready',
    signal_type: 'referral',
    client_type: 'gc',
    build_type: 'gym_fitness',
    location: 'Lewisville, TX',
    approx_sqft: 32500,
    next_action: 'Send estimate to GC',
    next_action_date: '2026-03-25',
    notes: 'New Crunch Fitness build-out. Full post-construction scope including polish, detail clean, and punch list support.',
  },
  {
    project_name: 'Data Center Garland Phase 2',
    client_name: 'Balfour Beatty',
    primary_contact_name: 'David Park',
    stage: 'qualification_underway',
    signal_type: 'outreach',
    client_type: 'gc',
    build_type: 'data_center',
    location: 'Garland, TX',
    approx_sqft: 85000,
    next_action: 'Schedule site walk with PM',
    next_action_date: '2026-03-28',
    notes: 'Phase 2 expansion of existing data center campus. Cleanroom protocols required.',
  },
  {
    project_name: 'Marriott TI Frisco',
    client_name: "Rogers-O'Brien",
    primary_contact_name: 'Jake Moreno',
    stage: 'project_signal_received',
    signal_type: 'repeat_client',
    client_type: 'gc',
    build_type: 'hospitality',
    location: 'Frisco, TX',
    approx_sqft: 18000,
    next_action: 'Review RFP documents',
    next_action_date: '2026-04-01',
    notes: 'Tenant improvement project at existing Marriott property. 120-room renovation scope.',
  },
]

export function seedPursuits(): void {
  const existingPursuits = db.list('pursuits')
  if (existingPursuits.length > 0) {
    return // Already seeded
  }

  // Ensure clients, contacts, and signals exist first
  seedClients()
  seedContacts()
  seedProjectSignals()

  // Build lookups
  const clients = db.list<Client>('clients')
  const clientByName = new Map(clients.map((c) => [c.name, c]))
  const contacts = db.list<Contact>('contacts')
  const signals = db.list<ProjectSignal>('project_signals')

  for (let i = 0; i < SEED_PURSUITS.length; i++) {
    const seed = SEED_PURSUITS[i]!
    const refNum = String(i + 1).padStart(4, '0')
    const client = clientByName.get(seed.client_name)

    if (!client) continue

    // Find primary contact if specified
    let primaryContactId: string | undefined
    let primaryContactFullName: string | undefined
    if (seed.primary_contact_name) {
      const contact = contacts.find(
        (c) =>
          c.client_id === client.id &&
          `${c.first_name} ${c.last_name}` === seed.primary_contact_name,
      )
      if (contact) {
        primaryContactId = contact.id
        primaryContactFullName = `${contact.first_name} ${contact.last_name}`
      }
    }

    // Find the matching passed signal for this pursuit
    const matchingSignal = signals.find(
      (s) =>
        s.project_identity === seed.project_name &&
        s.linked_client_id === client.id &&
        s.gate_outcome === 'passed',
    )

    if (!matchingSignal) continue // Cannot create pursuit without passed signal

    const pursuit = db.create<Pursuit>(
      'pursuits',
      {
        reference_id: `PUR-${refNum}`,
        linked_signal_id: matchingSignal.id,
        project_name: seed.project_name,
        client_id: client.id,
        client_name: seed.client_name,
        primary_contact_id: primaryContactId,
        primary_contact_name: primaryContactFullName,
        signal_type: seed.signal_type,
        client_type: seed.client_type,
        build_type: seed.build_type,
        location: seed.location,
        approx_sqft: seed.approx_sqft,
        stage: seed.stage,
        owner: client.owner ?? 'system-seed',
        next_action: seed.next_action ?? null,
        next_action_date: seed.next_action_date ?? null,
        notes: seed.notes,
      } as any,
      'system-seed',
    )

    // Link the pursuit back to the signal
    db.update<ProjectSignal>(
      'project_signals',
      matchingSignal.id,
      { created_pursuit_id: pursuit.id },
      'system-seed',
      `Pursuit ${pursuit.reference_id} created from this signal`,
    )
  }
}

// ---------------------------------------------------------------------------
// Project Signal seeds (ERP-12 — first-class record between Contact and Pursuit)
// ---------------------------------------------------------------------------

interface SeedProjectSignal {
  project_identity: string
  client_name: string
  contact_name?: string
  signal_type: ProjectSignalType
  source_evidence: string
  status: ProjectSignalState
  gate_outcome: 'pending' | 'passed' | 'failed' | 'deferred'
  timing_signal?: string
  fit_risk_note?: string
  next_action?: string
  next_action_date?: string
  notes?: string
}

const SEED_PROJECT_SIGNALS: SeedProjectSignal[] = [
  {
    project_identity: 'Crunch Fitness Lewisville',
    client_name: 'Summit Peak Builders',
    contact_name: 'Megan Torres',
    signal_type: 'referral',
    source_evidence: 'Megan Torres referred us for the Crunch Fitness build-out. Plans received via plan room.',
    status: 'passed',
    gate_outcome: 'passed',
    timing_signal: 'Substantial completion Q2 2026',
    fit_risk_note: 'Good fit — standard gym/fitness post-construction scope.',
    next_action: 'Pursuit opened — begin qualification',
    next_action_date: '2026-03-20',
    notes: 'Strong signal. Megan has awarded us 3 prior projects.',
  },
  {
    project_identity: 'Data Center Garland Phase 2',
    client_name: 'Balfour Beatty',
    contact_name: 'David Park',
    signal_type: 'direct_contact',
    source_evidence: 'David Park reached out directly about Phase 2 expansion. Cleanroom protocols required.',
    status: 'passed',
    gate_outcome: 'passed',
    timing_signal: 'Phase 2 targeting Q4 2026',
    fit_risk_note: 'Data center cleanroom — verify crew certification requirements.',
    next_action: 'Pursuit opened — schedule site walk',
    next_action_date: '2026-03-28',
  },
  {
    project_identity: 'Marriott TI Frisco',
    client_name: "Rogers-O'Brien",
    contact_name: 'Jake Moreno',
    signal_type: 'repeat_client',
    source_evidence: 'Jake Moreno flagged upcoming Marriott TI project at Frisco. 120-room renovation.',
    status: 'passed',
    gate_outcome: 'passed',
    timing_signal: 'RFP expected Q2 2026',
    fit_risk_note: 'Hospitality TI — good fit for BLU crew.',
    next_action: 'Pursuit opened — review RFP documents',
    next_action_date: '2026-04-01',
  },
  {
    project_identity: 'Medical Office Plano',
    client_name: 'HBA Design Build',
    contact_name: 'Tom Rivera',
    signal_type: 'event_network',
    source_evidence: 'Met Tom Rivera at AGC event. Mentioned upcoming medical office project in Plano.',
    status: 'under_review',
    gate_outcome: 'pending',
    timing_signal: 'Estimated start late 2026',
    fit_risk_note: 'Medical — need to confirm scope and timeline.',
    next_action: 'Follow up with Tom for project details',
    next_action_date: '2026-04-05',
    notes: 'Early-stage signal. Need more info before qualifying.',
  },
  {
    project_identity: 'Warehouse Conversion Houston',
    client_name: 'Whiting-Turner',
    signal_type: 'plan_room',
    source_evidence: 'Found in plan room listing. Whiting-Turner as GC. Large warehouse-to-office conversion.',
    status: 'deferred',
    gate_outcome: 'deferred',
    fit_risk_note: 'Houston market — outside current service radius. Revisit when Houston strategy is set.',
    next_action: 'Re-evaluate when Houston market entry is decided',
    next_action_date: '2026-06-01',
    notes: 'Deferred pending Houston market analysis completion.',
  },
]

export function seedProjectSignals(): void {
  const existing = db.list('project_signals')
  if (existing.length > 0) {
    return // Already seeded
  }

  // Ensure clients and contacts exist first
  seedClients()
  seedContacts()

  const clients = db.list<Client>('clients')
  const clientByName = new Map(clients.map((c) => [c.name, c]))
  const contacts = db.list<Contact>('contacts')

  for (let i = 0; i < SEED_PROJECT_SIGNALS.length; i++) {
    const seed = SEED_PROJECT_SIGNALS[i]!
    const refNum = String(i + 1).padStart(4, '0')
    const client = clientByName.get(seed.client_name)

    if (!client) continue

    // Find contact if specified
    let linkedContactId: string | undefined
    let linkedContactName: string | undefined
    if (seed.contact_name) {
      const contact = contacts.find(
        (c) =>
          c.client_id === client.id &&
          `${c.first_name} ${c.last_name}` === seed.contact_name,
      )
      if (contact) {
        linkedContactId = contact.id
        linkedContactName = `${contact.first_name} ${contact.last_name}`
      }
    }

    db.create<ProjectSignal>(
      'project_signals',
      {
        reference_id: `SIG-${refNum}`,
        status: seed.status,
        signal_type: seed.signal_type,
        source_evidence: seed.source_evidence,
        linked_client_id: client.id,
        linked_client_name: seed.client_name,
        linked_contact_id: linkedContactId,
        linked_contact_name: linkedContactName,
        project_identity: seed.project_identity,
        timing_signal: seed.timing_signal ?? null,
        fit_risk_note: seed.fit_risk_note ?? null,
        gate_outcome: seed.gate_outcome,
        gate_decision_by: seed.gate_outcome !== 'pending' ? 'system-seed' : null,
        gate_decision_date: seed.gate_outcome !== 'pending' ? new Date().toISOString() : null,
        owner: client.owner ?? 'system-seed',
        next_action: seed.next_action ?? null,
        next_action_date: seed.next_action_date ?? null,
        notes: seed.notes,
      } as any,
      'system-seed',
    )
  }
}

// ---------------------------------------------------------------------------
// Estimate seeds (ERP-13 Table 11)
// ---------------------------------------------------------------------------

interface SeedEstimate {
  project_name: string
  pursuit_name: string
  client_name: string
  status: EstimateStatus
  build_type: string
  square_footage: number
  tier_index: number
  stage_count: number
  pricing_summary: EstimatePricingSummary | null
  labor_target_hours: number | null
  assumptions: string | null
  scope_text: string | null
  qa_reviewer_id: string | null
  qa_reviewer_name: string | null
}

const SEED_ESTIMATES: SeedEstimate[] = [
  {
    project_name: 'Crunch Fitness Lewisville',
    pursuit_name: 'Crunch Fitness Lewisville',
    client_name: 'Summit Peak Builders',
    status: 'approved_for_proposal',
    build_type: 'gym_fitness',
    square_footage: 32500,
    tier_index: 3, // BLU Standard
    stage_count: 3,
    pricing_summary: {
      stage_breakdowns: [
        { stage_name: 'Rough Clean', weight: 0.35, subtotal: 8137.50 },
        { stage_name: 'Final Clean', weight: 0.45, subtotal: 10462.50 },
        { stage_name: 'Punch / Touch-Up', weight: 0.20, subtotal: 4650.00 },
      ],
      subtotal: 23250.00,
      adjustments: 1750.00,
      grand_total: 25000.00,
    },
    labor_target_hours: 312,
    assumptions: 'Standard gym build-out. Includes rubber flooring, mirrors, and equipment area. Access during normal business hours.',
    scope_text: 'Post-construction cleaning for 32,500 SF Crunch Fitness facility. Three-stage approach: rough clean, final clean, and punch/touch-up.',
    qa_reviewer_id: 'antonio',
    qa_reviewer_name: 'Antonio (Leadership)',
  },
  {
    project_name: 'Data Center Garland Phase 2',
    pursuit_name: 'Data Center Garland Phase 2',
    client_name: 'Balfour Beatty',
    status: 'draft',
    build_type: 'data_center',
    square_footage: 85000,
    tier_index: 4, // Stretch
    stage_count: 4,
    pricing_summary: null,
    labor_target_hours: null,
    assumptions: null,
    scope_text: null,
    qa_reviewer_id: null,
    qa_reviewer_name: null,
  },
]

export function seedEstimates(): void {
  const existing = db.list('estimates')
  if (existing.length > 0) {
    return
  }

  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()

  const clients = db.list<Client>('clients')
  const clientByName = new Map(clients.map((c) => [c.name, c]))
  const pursuits = db.list<Pursuit>('pursuits')

  for (let i = 0; i < SEED_ESTIMATES.length; i++) {
    const seed = SEED_ESTIMATES[i]!
    const refNum = String(i + 1).padStart(4, '0')
    const client = clientByName.get(seed.client_name)
    if (!client) continue

    const pursuit = pursuits.find(
      (p) => p.project_name === seed.pursuit_name && p.client_id === client.id,
    )
    if (!pursuit) continue

    db.create<Estimate>(
      'estimates',
      {
        reference_id: `EST-${refNum}`,
        status: seed.status,
        linked_pursuit_id: pursuit.id,
        linked_client_id: client.id,
        linked_client_name: seed.client_name,
        linked_pursuit_name: seed.pursuit_name,
        project_name: seed.project_name,
        build_type: seed.build_type,
        square_footage: seed.square_footage,
        stage_count: seed.stage_count,
        stage_selections: [],
        tier_index: seed.tier_index,
        base_rate: null,
        blu3_rate: null,
        surcharges: [],
        mobilization_cost: null,
        exterior_cost: null,
        window_cost: null,
        per_diem_cost: null,
        labor_target_hours: seed.labor_target_hours,
        assumptions: seed.assumptions,
        exclusions: null,
        scope_text: seed.scope_text,
        pricing_summary: seed.pricing_summary,
        qa_reviewer_id: seed.qa_reviewer_id,
        qa_reviewer_name: seed.qa_reviewer_name,
        qa_notes: null,
        version: 1,
        superseded_by_id: null,
        estimator_snapshot: null,
        owner: client.owner ?? 'system-seed',
      } as any,
      'system-seed',
    )
  }
}

// ---------------------------------------------------------------------------
// Proposal seeds (ERP-13 Table 12)
// ---------------------------------------------------------------------------

interface SeedProposal {
  project_name: string
  estimate_project_name: string
  client_name: string
  status: ProposalStatus
  proposal_value: number
  delivery_date: string
  decision_target_date: string | null
  acceptance_confirmation_method: string | null
  accepted_rejected_reason: string | null
}

const SEED_PROPOSALS: SeedProposal[] = [
  {
    project_name: 'Crunch Fitness Lewisville',
    estimate_project_name: 'Crunch Fitness Lewisville',
    client_name: 'Summit Peak Builders',
    status: 'accepted',
    proposal_value: 25000.00,
    delivery_date: '2026-03-10',
    decision_target_date: '2026-03-20',
    acceptance_confirmation_method: 'email',
    accepted_rejected_reason: null,
  },
]

export function seedProposals(): void {
  const existing = db.list('proposals')
  if (existing.length > 0) {
    return
  }

  seedEstimates()

  const clients = db.list<Client>('clients')
  const clientByName = new Map(clients.map((c) => [c.name, c]))
  const estimates = db.list<Estimate>('estimates')
  const pursuits = db.list<Pursuit>('pursuits')

  for (let i = 0; i < SEED_PROPOSALS.length; i++) {
    const seed = SEED_PROPOSALS[i]!
    const refNum = String(i + 1).padStart(4, '0')
    const client = clientByName.get(seed.client_name)
    if (!client) continue

    const estimate = estimates.find(
      (e) => e.project_name === seed.estimate_project_name && e.linked_client_id === client.id,
    )
    if (!estimate) continue

    const pursuit = pursuits.find((p) => p.id === estimate.linked_pursuit_id)

    db.create<Proposal>(
      'proposals',
      {
        reference_id: `PRO-${refNum}`,
        status: seed.status,
        linked_estimate_id: estimate.id,
        linked_pursuit_id: estimate.linked_pursuit_id,
        linked_client_id: client.id,
        linked_client_name: seed.client_name,
        project_name: seed.project_name,
        proposal_value: seed.proposal_value,
        version: 1,
        delivery_date: seed.delivery_date,
        decision_target_date: seed.decision_target_date,
        accepted_rejected_reason: seed.accepted_rejected_reason,
        acceptance_confirmation_method: seed.acceptance_confirmation_method,
        decision_cadence_next_date: null,
        external_notes: null,
        created_award_id: seed.status === 'accepted' ? `STUB_AWARD_PRO-${refNum}` : null,
        owner: client.owner ?? 'system-seed',
        next_action: seed.status === 'accepted' ? 'Create Award/Handoff record' : 'Follow up with client',
        next_action_date: seed.decision_target_date,
      } as any,
      'system-seed',
    )
  }
}

// ---------------------------------------------------------------------------
// Award/Handoff seeds (ERP-13 — bridge from Commercial to PM)
// ---------------------------------------------------------------------------

export function seedAwardHandoffs(): void {
  const existing = db.list('award_handoffs')
  if (existing.length > 0) {
    return
  }

  seedProposals()

  const clients = db.list<Client>('clients')
  const clientByName = new Map(clients.map((c) => [c.name, c]))
  const proposals = db.list<Proposal>('proposals')
  const estimates = db.list<Estimate>('estimates')

  // Find the accepted Crunch Fitness proposal
  const crunchClient = clientByName.get('Summit Peak Builders')
  if (!crunchClient) return

  const crunchProposal = proposals.find(
    (p) => p.project_name === 'Crunch Fitness Lewisville' && p.status === 'accepted',
  )
  if (!crunchProposal) return

  const crunchEstimate = estimates.find((e) => e.id === crunchProposal.linked_estimate_id)
  if (!crunchEstimate) return

  const baselineSnapshot: Record<string, unknown> = {
    estimate_id: crunchEstimate.id,
    estimate_ref: crunchEstimate.reference_id,
    proposal_id: crunchProposal.id,
    proposal_ref: crunchProposal.reference_id,
    project_name: crunchProposal.project_name,
    build_type: crunchEstimate.build_type,
    square_footage: crunchEstimate.square_footage,
    tier_index: crunchEstimate.tier_index,
    stage_count: crunchEstimate.stage_count,
    pricing_summary: crunchEstimate.pricing_summary,
    proposal_value: crunchProposal.proposal_value,
    assumptions: crunchEstimate.assumptions,
    exclusions: crunchEstimate.exclusions,
    scope_text: crunchEstimate.scope_text,
    snapshot_date: new Date().toISOString(),
  }

  const complianceDocs: ComplianceDocItem[] = [
    { doc_name: 'Certificate of Insurance (COI)', required: true, status: 'received', received_date: '2026-03-12', notes: null },
    { doc_name: 'W-9', required: true, status: 'received', received_date: '2026-03-12', notes: null },
    { doc_name: 'Signed Subcontract / PO', required: true, status: 'received', received_date: '2026-03-14', notes: null },
    { doc_name: 'Safety Plan', required: true, status: 'received', received_date: '2026-03-15', notes: null },
    { doc_name: 'Background Check Clearance', required: false, status: 'waived', received_date: null, notes: 'Not required per GC for this project' },
  ]

  const awardHandoff = db.create<AwardHandoff>(
    'award_handoffs',
    {
      reference_id: 'AWD-0001',
      status: 'pm_claimed' as AwardHandoffState,
      linked_proposal_id: crunchProposal.id,
      linked_pursuit_id: crunchProposal.linked_pursuit_id,
      linked_estimate_id: crunchProposal.linked_estimate_id,
      linked_client_id: crunchClient.id,
      project_name: 'Crunch Fitness Lewisville',
      accepted_baseline_snapshot: baselineSnapshot,
      compliance_tracker: complianceDocs,
      startup_blockers: [] as StartupBlockerItem[],
      teams_handoff_post_url: null,
      pm_claim_user_id: 'cullen',
      pm_claim_timestamp: '2026-03-16T14:00:00.000Z',
      created_project_id: null,
      owner: 'cullen',
      next_action: 'Confirm handoff receipt and close to ops',
      next_action_date: '2026-03-20',
    } as any,
    'system-seed',
  )

  // Update proposal with the real award ID
  db.update<Proposal>(
    'proposals',
    crunchProposal.id,
    { created_award_id: awardHandoff.id },
    'system-seed',
    `Award/Handoff ${awardHandoff.reference_id} seeded`,
  )
}

// ---------------------------------------------------------------------------
// Project seeds (ERP-13 — PM lifecycle)
// ---------------------------------------------------------------------------

export function seedProjects(): void {
  const existing = db.list('projects')
  if (existing.length > 0) {
    return
  }

  seedAwardHandoffs()

  const clients = db.list<Client>('clients')
  const clientByName = new Map(clients.map((c) => [c.name, c]))
  const awardHandoffs = db.list<AwardHandoff>('award_handoffs')

  const crunchClient = clientByName.get('Summit Peak Builders')
  if (!crunchClient) return

  const crunchAward = awardHandoffs.find(
    (a) => a.project_name === 'Crunch Fitness Lewisville',
  )
  if (!crunchAward) return

  const project = db.create<Project>(
    'projects',
    {
      reference_id: 'PRJ-0001',
      status: 'forecasting_active' as ProjectState,
      linked_award_handoff_id: crunchAward.id,
      linked_client_id: crunchClient.id,
      project_name: 'Crunch Fitness Lewisville',
      pm_owner_id: 'cullen',
      commercial_baseline_snapshot: crunchAward.accepted_baseline_snapshot,
      client_stage_map: null,
      target_turnover_date: '2026-06-15',
      billing_references: null,
      active_change_order_count: 0,
      owner: 'cullen',
      next_action: 'Create first mobilization and begin forecasting',
      next_action_date: '2026-03-25',
    } as any,
    'system-seed',
  )

  // Link project back to award
  db.update<AwardHandoff>(
    'award_handoffs',
    crunchAward.id,
    { created_project_id: project.id, status: 'closed_to_ops' as AwardHandoffState },
    'system-seed',
    `Project ${project.reference_id} created from closed_to_ops`,
  )
}

// ---------------------------------------------------------------------------
// Mobilization seeds (ERP-13 — child records under Project)
// ---------------------------------------------------------------------------

export function seedMobilizations(): void {
  const existing = db.list('mobilizations')
  if (existing.length > 0) {
    return
  }

  seedProjects()

  const projects = db.list<Project>('projects')
  const crunchProject = projects.find((p) => p.project_name === 'Crunch Fitness Lewisville')
  if (!crunchProject) return

  const defaultReadiness: ReadinessChecklist = {
    crew_confirmed: false,
    equipment_loaded: false,
    travel_booked: false,
    lodging_booked: false,
    per_diem_approved: false,
    jobber_synced: false,
    teams_posted: false,
  }

  const trip1Equipment: EquipmentChecklistItem[] = [
    { item: 'Floor scrubber', status: 'packed', notes: null },
    { item: 'Pressure washer', status: 'packed', notes: null },
    { item: 'Scaffolding', status: 'needed', notes: 'Rental pending' },
    { item: 'HEPA vacuums (x4)', status: 'packed', notes: null },
  ]

  // Trip 1 — needs_planning (most planning done)
  db.create<Mobilization>(
    'mobilizations',
    {
      reference_id: 'MOB-0001',
      status: 'needs_planning' as MobilizationState,
      linked_project_id: crunchProject.id,
      linked_client_id: crunchProject.linked_client_id,
      stage_name: 'Trip 1 — Rough Clean',
      crew_lead_id: 'marcus-johnson',
      named_technicians: ['tech-001', 'tech-002', 'tech-003'],
      requested_start_date: '2026-04-07',
      requested_end_date: '2026-04-11',
      actual_start_date: null,
      actual_end_date: null,
      site_address: '1234 Main St, Lewisville, TX 75057',
      access_plan: 'Badge access through GC trailer, check in with site super by 6:30 AM',
      travel_posture: 'local',
      lodging_details: null,
      per_diem_budget: null,
      equipment_checklist: trip1Equipment,
      vehicle_plan: 'BLU truck #3 + equipment trailer',
      readiness_checklist: {
        ...defaultReadiness,
        crew_confirmed: true,
        travel_booked: true,
        per_diem_approved: true,
      },
      compressed_planning: false,
      daily_reports: [],
      photo_report_link: null,
      client_signoff_status: null,
      qc_stage_completion: null,
      invoice_release_status: null,
      blocker_reason: null,
      blocker_owner: null,
      missing_items_log: null,
      actuals_notes: null,
      owner: 'cullen',
      next_action: 'Confirm equipment loaded and lodging (if needed)',
      next_action_date: '2026-04-01',
    } as any,
    'system-seed',
  )

  // Trip 2 — handoff_incomplete (early stage)
  db.create<Mobilization>(
    'mobilizations',
    {
      reference_id: 'MOB-0002',
      status: 'handoff_incomplete' as MobilizationState,
      linked_project_id: crunchProject.id,
      linked_client_id: crunchProject.linked_client_id,
      stage_name: 'Trip 2 — Final Clean',
      crew_lead_id: null,
      named_technicians: [],
      requested_start_date: '2026-05-12',
      requested_end_date: '2026-05-16',
      actual_start_date: null,
      actual_end_date: null,
      site_address: '1234 Main St, Lewisville, TX 75057',
      access_plan: null,
      travel_posture: 'local',
      lodging_details: null,
      per_diem_budget: null,
      equipment_checklist: [],
      vehicle_plan: null,
      readiness_checklist: defaultReadiness,
      compressed_planning: false,
      daily_reports: [],
      photo_report_link: null,
      client_signoff_status: null,
      qc_stage_completion: null,
      invoice_release_status: null,
      blocker_reason: null,
      blocker_owner: null,
      missing_items_log: ['Crew lead not assigned', 'Equipment list not created'],
      actuals_notes: null,
      owner: 'cullen',
      next_action: 'Assign crew lead and build equipment list',
      next_action_date: '2026-04-20',
    } as any,
    'system-seed',
  )
}

// ---------------------------------------------------------------------------
// Change Order seeds (ERP-13 — post-award scope revision)
// ---------------------------------------------------------------------------

export function seedChangeOrders(): void {
  const existing = db.list('change_orders')
  if (existing.length > 0) {
    return
  }

  seedProjects()
  seedMobilizations()

  const projects = db.list<Project>('projects')
  const crunchProject = projects.find((p) => p.project_name === 'Crunch Fitness Lewisville')
  if (!crunchProject) return

  const pricingDelta: PricingDelta = {
    original_value: 25000,
    revised_value: 27500,
    delta: 2500,
  }

  db.create<ChangeOrder>(
    'change_orders',
    {
      reference_id: 'CO-0001',
      status: 'approved' as ChangeOrderState,
      linked_project_id: crunchProject.id,
      linked_mobilization_id: null,
      linked_client_id: crunchProject.linked_client_id,
      origin: 'pm_field_discovery',
      scope_delta: 'Exterior window cleaning added — discovered during rough clean that GC scope excludes storefront glass. Client approved addition of full exterior glass cleaning package.',
      pricing_delta: pricingDelta,
      schedule_delta: 'Adds 1 day to final clean mobilization',
      mobilization_impact: 'Trip 2 extended by 1 day. Equipment list updated to include squeegee kits.',
      fact_packet_by: 'cullen',
      priced_by: 'antonio',
      approval_notes: 'Client agreed to scope addition via email 2026-03-28',
      release_notes: null,
      client_response_date: '2026-03-28',
      rejection_reason: null,
      owner: 'cullen',
      next_action: 'Release to project and update billing',
      next_action_date: '2026-04-01',
    } as any,
    'system-seed',
  )

  // Update project active_change_order_count
  db.update<Project>(
    'projects',
    crunchProject.id,
    { active_change_order_count: 1 },
    'system-seed',
    'CO-0001 seeded as approved',
  )
}

// ---------------------------------------------------------------------------
// Expansion Task seeds (ERP-13 — post-project growth tracking)
// ---------------------------------------------------------------------------

export function seedExpansionTasks(): void {
  const existing = db.list('expansion_tasks')
  if (existing.length > 0) {
    return
  }

  seedProjects()

  const projects = db.list<Project>('projects')
  const crunchProject = projects.find((p) => p.project_name === 'Crunch Fitness Lewisville')
  if (!crunchProject) return

  db.create<ExpansionTask>(
    'expansion_tasks',
    {
      reference_id: 'EXP-0001',
      status: 'in_progress' as ExpansionTaskState,
      linked_project_id: crunchProject.id,
      linked_client_id: crunchProject.linked_client_id,
      task_type: 'thank_you',
      growth_objective: 'Send thank-you package to Megan Torres at Summit Peak for the Crunch Fitness award. Include BLU Crew branded items and handwritten note from Antonio.',
      due_date: '2026-04-10',
      referral_status: null,
      testimonial_status: null,
      next_signal_created: false,
      next_signal_id: null,
      completion_outcome: null,
      owner: 'marcus-johnson',
      next_action: 'Prepare and send thank-you package',
      next_action_date: '2026-04-05',
    } as any,
    'system-seed',
  )
}

// Allow running directly
if (typeof require !== 'undefined' && require.main === module) {
  seedClients()
  seedContacts()
  seedProjectSignals()
  seedPursuits()
  seedEstimates()
  seedProposals()
  seedAwardHandoffs()
  seedProjects()
  seedMobilizations()
  seedChangeOrders()
  seedExpansionTasks()
  console.log('Seeded 6 clients, 8 contacts, 5 project signals, 3 pursuits, 2 estimates, 1 proposal, 1 award/handoff, 1 project, 2 mobilizations, 1 change order, and 1 expansion task.')
}
