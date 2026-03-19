'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  listEquipmentTemplatesAction,
  createEquipmentTemplateAction,
  updateEquipmentTemplateAction,
  archiveEquipmentTemplateAction,
} from '@/actions/equipment-template'
import type { EquipmentTemplate, EquipmentTemplateItem } from '@/types/commercial'
import {
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  GripVertical,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function EquipmentTemplatesPage() {
  const [templates, setTemplates] = useState<EquipmentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const loadTemplates = useCallback(async () => {
    const result = await listEquipmentTemplatesAction()
    if (result.success && result.data) {
      setTemplates(result.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Archive template "${name}"? This cannot be undone.`)) return
    const result = await archiveEquipmentTemplateAction(id)
    if (result.success) {
      toast.success(`Template "${name}" archived`)
      loadTemplates()
    } else {
      toast.error(result.error ?? 'Failed to archive template')
    }
  }

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">Admin</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Equipment Templates</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipment Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage reusable equipment checklist templates for mobilizations
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <TemplateForm
          inputClass={inputClass}
          onSave={async (data) => {
            const result = await createEquipmentTemplateAction(data)
            if (result.success) {
              toast.success(`Template "${data.name}" created`)
              setCreating(false)
              loadTemplates()
            } else {
              toast.error(result.error ?? 'Failed to create template')
            }
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Template list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading templates...</p>
      ) : templates.length === 0 && !creating ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No equipment templates yet.</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Create your first template
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <div key={t.id}>
              {editingId === t.id ? (
                <TemplateForm
                  inputClass={inputClass}
                  initial={t}
                  onSave={async (data) => {
                    const result = await updateEquipmentTemplateAction({ id: t.id, ...data })
                    if (result.success) {
                      toast.success(`Template "${data.name}" updated`)
                      setEditingId(null)
                      loadTemplates()
                    } else {
                      toast.error(result.error ?? 'Failed to update template')
                    }
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{t.name}</h3>
                      {t.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                          {t.items.length} item{t.items.length !== 1 ? 's' : ''}
                        </span>
                        {t.build_types.map((bt) => (
                          <span
                            key={bt}
                            className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {bt}
                          </span>
                        ))}
                      </div>
                      {/* Item preview */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {t.items.slice(0, 6).map((item, i) => (
                          <span key={i} className="rounded bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                            {item.item}
                          </span>
                        ))}
                        {t.items.length > 6 && (
                          <span className="text-xs text-muted-foreground">
                            +{t.items.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingId(t.id)}
                        className="rounded p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        title="Edit template"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="rounded p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        title="Delete template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template Form Component (used for both create and edit)
// ---------------------------------------------------------------------------

interface TemplateFormData {
  name: string
  description: string
  items: EquipmentTemplateItem[]
  build_types: string[]
}

function TemplateForm({
  initial,
  inputClass,
  onSave,
  onCancel,
}: {
  initial?: EquipmentTemplate
  inputClass: string
  onSave: (data: TemplateFormData) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [buildTypesStr, setBuildTypesStr] = useState(initial?.build_types.join(', ') ?? '')
  const [items, setItems] = useState<EquipmentTemplateItem[]>(
    initial?.items.map(i => ({ ...i })) ?? [{ item: '', default_status: 'needed', notes: null }],
  )
  const [saving, setSaving] = useState(false)
  const [newItemName, setNewItemName] = useState('')

  function addItem() {
    const itemName = newItemName.trim()
    if (!itemName) return
    setItems(prev => [...prev, { item: itemName, default_status: 'needed', notes: null }])
    setNewItemName('')
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof EquipmentTemplateItem, value: string) {
    setItems(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item
        if (field === 'default_status') return { ...item, default_status: value as 'needed' | 'packed' }
        if (field === 'notes') return { ...item, notes: value || null }
        return { ...item, [field]: value }
      }),
    )
  }

  function moveItem(idx: number, direction: -1 | 1) {
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= items.length) return
    setItems(prev => {
      const next = [...prev]
      const temp = next[idx]!
      next[idx] = next[newIdx]!
      next[newIdx] = temp
      return next
    })
  }

  async function handleSubmit() {
    const validItems = items.filter(i => i.item.trim())
    if (!name.trim()) { toast.error('Name is required'); return }
    if (validItems.length === 0) { toast.error('At least one item is required'); return }
    setSaving(true)
    await onSave({
      name: name.trim(),
      description: description.trim(),
      items: validItems,
      build_types: buildTypesStr.split(',').map(s => s.trim()).filter(Boolean),
    })
    setSaving(false)
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {initial ? 'Edit Template' : 'New Template'}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Hospital Deep Clean"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Build Types</label>
          <input
            type="text"
            value={buildTypesStr}
            onChange={e => setBuildTypesStr(e.target.value)}
            placeholder="Comma-separated: office_buildout, retail"
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What type of job is this template for?"
            rows={2}
            className={inputClass}
          />
        </div>
      </div>

      {/* Items */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Equipment Items ({items.filter(i => i.item.trim()).length})
        </label>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 rounded border border-border px-2 py-1.5">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveItem(i, -1)}
                  disabled={i === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  title="Move up"
                >
                  <GripVertical className="h-3 w-3" />
                </button>
              </div>
              <input
                type="text"
                value={item.item}
                onChange={e => updateItem(i, 'item', e.target.value)}
                placeholder="Equipment name"
                className="flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-sm text-foreground hover:border-input focus:border-input focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <select
                value={item.default_status}
                onChange={e => updateItem(i, 'default_status', e.target.value)}
                className={cn(
                  'rounded border px-2 py-1 text-xs font-medium',
                  item.default_status === 'packed'
                    ? 'border-green-300 bg-green-50 text-green-800'
                    : 'border-red-300 bg-red-50 text-red-800',
                )}
              >
                <option value="needed">Needed</option>
                <option value="packed">Packed</option>
              </select>
              <input
                type="text"
                value={item.notes ?? ''}
                onChange={e => updateItem(i, 'notes', e.target.value)}
                placeholder="Notes"
                className="w-48 rounded border border-transparent bg-transparent px-2 py-1 text-xs text-muted-foreground hover:border-input focus:border-input focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              placeholder="Add equipment item..."
              className={cn(inputClass, 'flex-1')}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
            />
            <button
              onClick={addItem}
              disabled={!newItemName.trim()}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium',
                newItemName.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
