import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
  is_deleted: boolean
}

export interface AuditEntry {
  id: string
  timestamp: string
  actor_id: string
  entity_type: string
  entity_id: string
  action: 'create' | 'update' | 'delete' | 'transition'
  field_changes: Record<string, { from: unknown; to: unknown }>
  reason?: string
}

export interface DatabaseSchema {
  clients: Record<string, BaseEntity & Record<string, unknown>>
  contacts: Record<string, BaseEntity & Record<string, unknown>>
  pursuits: Record<string, BaseEntity & Record<string, unknown>>
  estimates: Record<string, BaseEntity & Record<string, unknown>>
  proposals: Record<string, BaseEntity & Record<string, unknown>>
  decision_records: Record<string, BaseEntity & Record<string, unknown>>
  awards: Record<string, BaseEntity & Record<string, unknown>>
  compliance_packets: Record<string, BaseEntity & Record<string, unknown>>
  handoff_packages: Record<string, BaseEntity & Record<string, unknown>>
  change_orders: Record<string, BaseEntity & Record<string, unknown>>
  expansion_opportunities: Record<string, BaseEntity & Record<string, unknown>>
  audit_log: AuditEntry[]
}

export type CollectionName = keyof Omit<DatabaseSchema, 'audit_log'>

export type QueryFilter<T> = {
  [K in keyof T]?: T[K] | ((value: T[K]) => boolean)
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DB_DIR = path.join(process.cwd(), '.data')
const DB_PATH = path.join(DB_DIR, 'workflow-db.json')

function emptyDb(): DatabaseSchema {
  return {
    clients: {},
    contacts: {},
    pursuits: {},
    estimates: {},
    proposals: {},
    decision_records: {},
    awards: {},
    compliance_packets: {},
    handoff_packages: {},
    change_orders: {},
    expansion_opportunities: {},
    audit_log: [],
  }
}

// ---------------------------------------------------------------------------
// Low-level read/write
// ---------------------------------------------------------------------------

function ensureDbExists(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(emptyDb(), null, 2), 'utf-8')
  }
}

function readDb(): DatabaseSchema {
  ensureDbExists()
  const raw = fs.readFileSync(DB_PATH, 'utf-8')
  return JSON.parse(raw) as DatabaseSchema
}

function writeDb(data: DatabaseSchema): void {
  ensureDbExists()
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// Audit helper
// ---------------------------------------------------------------------------

function logAudit(
  db: DatabaseSchema,
  entry: Omit<AuditEntry, 'id' | 'timestamp'>,
): void {
  db.audit_log.push({
    ...entry,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get a single entity by ID. Returns undefined if not found or soft-deleted. */
export function getById<T extends BaseEntity>(
  collection: CollectionName,
  id: string,
): T | undefined {
  const db = readDb()
  const entity = db[collection][id] as T | undefined
  if (!entity || entity.is_deleted) return undefined
  return entity
}

/** List all non-deleted entities in a collection. */
export function list<T extends BaseEntity>(
  collection: CollectionName,
): T[] {
  const db = readDb()
  return Object.values(db[collection]).filter(
    (e) => !e.is_deleted,
  ) as T[]
}

/** Query entities matching filter criteria. */
export function query<T extends BaseEntity>(
  collection: CollectionName,
  filter: QueryFilter<T>,
): T[] {
  const all = list<T>(collection)
  return all.filter((entity) =>
    Object.entries(filter).every(([key, condition]) => {
      const value = (entity as Record<string, unknown>)[key]
      if (typeof condition === 'function') {
        return (condition as (v: unknown) => boolean)(value)
      }
      return value === condition
    }),
  )
}

/** Create a new entity. Returns the created entity with generated ID. */
export function create<T extends BaseEntity>(
  collection: CollectionName,
  data: Omit<T, keyof BaseEntity> & { id?: string },
  actorId: string,
): T {
  const db = readDb()
  const now = new Date().toISOString()
  const id = data.id ?? uuidv4()

  const entity = {
    ...data,
    id,
    created_at: now,
    updated_at: now,
    created_by: actorId,
    updated_by: actorId,
    is_deleted: false,
  } as unknown as T

  db[collection][id] = entity as BaseEntity & Record<string, unknown>

  logAudit(db, {
    actor_id: actorId,
    entity_type: collection,
    entity_id: id,
    action: 'create',
    field_changes: {},
  })

  writeDb(db)
  return entity
}

/** Update an existing entity. Returns the updated entity. */
export function update<T extends BaseEntity>(
  collection: CollectionName,
  id: string,
  changes: Partial<Omit<T, keyof BaseEntity>>,
  actorId: string,
  reason?: string,
): T {
  const db = readDb()
  const existing = db[collection][id]
  if (!existing || existing.is_deleted) {
    throw new Error(`Entity ${id} not found in ${collection}`)
  }

  const fieldChanges: Record<string, { from: unknown; to: unknown }> = {}
  for (const [key, value] of Object.entries(changes)) {
    const oldVal = (existing as Record<string, unknown>)[key]
    if (oldVal !== value) {
      fieldChanges[key] = { from: oldVal, to: value }
    }
  }

  const updated = {
    ...existing,
    ...changes,
    updated_at: new Date().toISOString(),
    updated_by: actorId,
  }

  db[collection][id] = updated

  logAudit(db, {
    actor_id: actorId,
    entity_type: collection,
    entity_id: id,
    action: 'update',
    field_changes: fieldChanges,
    reason,
  })

  writeDb(db)
  return updated as unknown as T
}

/** Soft-delete an entity. */
export function softDelete(
  collection: CollectionName,
  id: string,
  actorId: string,
  reason: string,
): void {
  const db = readDb()
  const existing = db[collection][id]
  if (!existing || existing.is_deleted) {
    throw new Error(`Entity ${id} not found in ${collection}`)
  }

  existing.is_deleted = true
  existing.updated_at = new Date().toISOString()
  existing.updated_by = actorId

  logAudit(db, {
    actor_id: actorId,
    entity_type: collection,
    entity_id: id,
    action: 'delete',
    field_changes: { is_deleted: { from: false, to: true } },
    reason,
  })

  writeDb(db)
}

/** Get audit log entries for a specific entity. */
export function getAuditLog(
  entityType: CollectionName,
  entityId: string,
): AuditEntry[] {
  const db = readDb()
  return db.audit_log.filter(
    (e) => e.entity_type === entityType && e.entity_id === entityId,
  )
}

/** Reset the database (for testing only). */
export function resetDb(): void {
  writeDb(emptyDb())
}
