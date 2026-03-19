/**
 * Contact utility functions for primary contact resolution and tier calculation.
 */

import type { Contact, ContactLayer, ClientTier } from '@/types/commercial'

// ---------------------------------------------------------------------------
// Role-to-Layer mapping (FIX 4)
// ---------------------------------------------------------------------------

const ROLE_LAYER_MAP: Record<string, ContactLayer> = {
  // Exec/Owner Rep (Layer 3+)
  'exec': 'exec_owner_rep',
  'owner rep': 'exec_owner_rep',
  'vp': 'exec_owner_rep',
  'vice president': 'exec_owner_rep',
  'director': 'exec_owner_rep',
  'c-suite': 'exec_owner_rep',
  'ceo': 'exec_owner_rep',
  'cfo': 'exec_owner_rep',
  'coo': 'exec_owner_rep',
  'cto': 'exec_owner_rep',
  'president': 'exec_owner_rep',
  'principal': 'exec_owner_rep',
  'partner': 'exec_owner_rep',
  'svp': 'exec_owner_rep',
  'evp': 'exec_owner_rep',
  'managing director': 'exec_owner_rep',

  // PM/Super/Field Lead (Layer 2)
  'pm': 'pm_super_field',
  'project manager': 'pm_super_field',
  'super': 'pm_super_field',
  'superintendent': 'pm_super_field',
  'field lead': 'pm_super_field',
  'project engineer': 'pm_super_field',
  'senior pm': 'pm_super_field',
  'assistant pm': 'pm_super_field',
  'assistant superintendent': 'pm_super_field',
  'foreman': 'pm_super_field',
  'site manager': 'pm_super_field',

  // Estimator/Precon (Layer 2)
  'estimator': 'estimator_precon',
  'precon': 'estimator_precon',
  'preconstruction': 'estimator_precon',
  'precon manager': 'estimator_precon',
  'chief estimator': 'estimator_precon',
  'senior estimator': 'estimator_precon',

  // Coordinator/Admin (Layer 1)
  'coordinator': 'coordinator_admin',
  'admin': 'coordinator_admin',
  'administrator': 'coordinator_admin',
  'ap': 'coordinator_admin',
  'accounts payable': 'coordinator_admin',
  'contracts': 'coordinator_admin',
  'contracts manager': 'coordinator_admin',
  'procurement': 'coordinator_admin',
  'office manager': 'coordinator_admin',
  'project coordinator': 'coordinator_admin',
  'project assistant': 'coordinator_admin',
  'receptionist': 'coordinator_admin',
  'billing': 'coordinator_admin',
  'ar': 'coordinator_admin',
  'accounts receivable': 'coordinator_admin',
}

/**
 * Given a role_type string, infer the contact layer.
 * Uses fuzzy matching: normalizes the input and checks against known patterns.
 * Returns undefined if no match is found.
 */
export function roleToLayer(roleType: string): ContactLayer | undefined {
  const normalized = roleType.trim().toLowerCase()

  // Direct match
  if (ROLE_LAYER_MAP[normalized]) {
    return ROLE_LAYER_MAP[normalized]
  }

  // Check if any key is contained in the normalized role
  for (const [key, layer] of Object.entries(ROLE_LAYER_MAP)) {
    if (normalized.includes(key)) {
      return layer
    }
  }

  return undefined
}

// ---------------------------------------------------------------------------
// Tier layer grouping (FIX 3)
// ---------------------------------------------------------------------------

/** The three key layers used for tier calculation */
type TierLayer = 'exec_owner_rep' | 'pm_super_field' | 'coordinator_admin'

/** Maps a ContactLayer to the tier-layer grouping */
function toTierLayer(layer: ContactLayer): TierLayer | null {
  switch (layer) {
    case 'exec_owner_rep':
      return 'exec_owner_rep'
    case 'pm_super_field':
    case 'estimator_precon':
      return 'pm_super_field'
    case 'coordinator_admin':
      return 'coordinator_admin'
    case 'blu_champion':
      return null // Champions don't count as a tier layer by themselves
    default:
      return null
  }
}

/**
 * Calculate tier for a client based on the distinct contact layers covered.
 * - Tier A: All 3 key layers covered
 * - Tier B: 2 of 3 key layers covered
 * - Tier C: 1 or 0 layers covered
 */
export function getTierForContacts(contacts: Contact[]): ClientTier {
  const coveredLayers = new Set<TierLayer>()

  for (const contact of contacts) {
    const tierLayer = toTierLayer(contact.layer)
    if (tierLayer) {
      coveredLayers.add(tierLayer)
    }
  }

  if (coveredLayers.size >= 3) return 'A'
  if (coveredLayers.size === 2) return 'B'
  return 'C'
}

// ---------------------------------------------------------------------------
// Influence ranking
// ---------------------------------------------------------------------------

const INFLUENCE_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

/**
 * Get the primary contact for a client — the contact with the highest influence level.
 * Among contacts with the same influence, prefers exec_owner_rep layer, then decision_maker behavior.
 */
export function getPrimaryContact(contacts: Contact[]): Contact | undefined {
  if (contacts.length === 0) return undefined

  return contacts.reduce((best, current) => {
    const bestRank = INFLUENCE_RANK[best.influence] ?? 0
    const currentRank = INFLUENCE_RANK[current.influence] ?? 0

    if (currentRank > bestRank) return current
    if (currentRank === bestRank) {
      // Prefer exec_owner_rep layer
      if (current.layer === 'exec_owner_rep' && best.layer !== 'exec_owner_rep') return current
      // Then prefer champions
      if (current.is_champion && !best.is_champion) return current
    }
    return best
  })
}
