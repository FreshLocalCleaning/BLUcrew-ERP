/**
 * Seed script — populates the JSON DB with sample data.
 * Run with: npx tsx src/lib/db/seed.ts
 */

import * as db from './json-db'
import type { Client, Contact } from '@/types/commercial'
import type { ClientState } from '@/lib/state-machines/client'

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
  next_action?: string
  next_action_date?: string
  bd_owner_name?: string
  notes?: string
}

const SEED_CLIENTS: SeedClient[] = [
  {
    name: 'Summit Peak Builders',
    tier: 'A',
    status: 'active_customer',
    market: 'dallas_fort_worth',
    vertical: 'general_contractor',
    relationship_strength: 'active',
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
    next_action: 'Research recent project wins',
    next_action_date: '2026-04-01',
    bd_owner_name: 'Sarah Chen',
    notes: 'Austin market entry target. Large healthcare portfolio.',
  },
  {
    name: 'Rogers-O\'Brien',
    tier: 'A',
    status: 'strategic_preferred',
    market: 'dallas_fort_worth',
    vertical: 'general_contractor',
    relationship_strength: 'trusted',
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
        next_action: seed.next_action,
        next_action_date: seed.next_action_date,
        bd_owner_name: seed.bd_owner_name,
        notes: seed.notes,
        contacts: [],
      } as Omit<Client, keyof db.BaseEntity>,
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
  },
  {
    first_name: 'Rachel',
    last_name: 'Kim',
    title: 'VP of Operations',
    client_name: 'Rogers-O\'Brien',
    layer: 'exec_owner_rep',
    role_type: 'VP Ops',
    influence: 'high',
    relationship_strength: 'developing',
    source_channel: 'event',
    is_champion: false,
    email: 'rachel.kim@roconnell.com',
    next_step: 'Schedule intro with CEO',
    last_touch_date: '2026-03-05',
    touch_count: 4,
    notes: 'Met at DFW Construction Summit. Interested in our quality process.',
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
  },
  {
    first_name: 'David',
    last_name: 'Park',
    title: 'Preconstruction Manager',
    client_name: 'Balfour Beatty',
    layer: 'estimator_precon',
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
  },
  {
    first_name: 'Tom',
    last_name: 'Rivera',
    title: 'Director of Construction',
    client_name: 'HBA Design Build',
    layer: 'exec_owner_rep',
    role_type: 'Dir Construction',
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
      } as Omit<Contact, keyof db.BaseEntity>,
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

// Allow running directly
if (typeof require !== 'undefined' && require.main === module) {
  seedClients()
  seedContacts()
  console.log('Seeded 6 clients and 8 contacts.')
}
