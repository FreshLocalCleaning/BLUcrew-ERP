/**
 * Seed script — populates the JSON DB with sample data.
 * Run with: npx tsx src/lib/db/seed.ts
 */

import * as db from './json-db'
import type { Client } from '@/types/commercial'
import type { ClientState } from '@/lib/state-machines/client'

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

// Allow running directly
if (typeof require !== 'undefined' && require.main === module) {
  seedClients()
  console.log('Seeded 6 sample clients.')
}
