/**
 * Client Data Access Layer
 *
 * All client reads/writes go through these functions.
 * Uses the generic JSON DB utility under the hood.
 */

import * as db from './json-db'
import type { Client } from '@/types/commercial'

const COLLECTION = 'clients' as const

/** Generate a human-readable reference ID: CLT-0001 through CLT-9999 */
export function generateReferenceId(): string {
  const all = db.list<Client>(COLLECTION)
  const maxNum = all.reduce((max, c) => {
    const match = c.reference_id.match(/^CLT-(\d+)$/)
    const num = match ? parseInt(match[1]!, 10) : 0
    return Math.max(max, num)
  }, 0)
  return `CLT-${String(maxNum + 1).padStart(4, '0')}`
}

/** Get a single client by ID. */
export function getClient(id: string): Client | undefined {
  return db.getById<Client>(COLLECTION, id)
}

/** List all non-deleted clients. */
export function listClients(): Client[] {
  return db.list<Client>(COLLECTION)
}

/** Create a new client. Generates reference_id and sets initial status. */
export function createClient(
  data: Omit<Client, keyof db.BaseEntity | 'reference_id' | 'status' | 'contacts'> & {
    contacts?: string[]
  },
  actorId: string,
): Client {
  const reference_id = generateReferenceId()
  return db.create<Client>(
    COLLECTION,
    {
      ...data,
      reference_id,
      status: 'watchlist',
      contacts: data.contacts ?? [],
    } as Omit<Client, keyof db.BaseEntity>,
    actorId,
  )
}

/** Update an existing client. */
export function updateClient(
  id: string,
  changes: Partial<Omit<Client, keyof db.BaseEntity>>,
  actorId: string,
  reason?: string,
): Client {
  return db.update<Client>(COLLECTION, id, changes, actorId, reason)
}

/** Soft-delete a client. */
export function archiveClient(id: string, actorId: string, reason: string): void {
  db.softDelete(COLLECTION, id, actorId, reason)
}

/** Get audit log for a specific client. */
export function getClientAuditLog(clientId: string) {
  return db.getAuditLog(COLLECTION, clientId)
}
