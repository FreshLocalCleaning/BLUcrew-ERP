'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import {
  CONTACT_INFLUENCE_LABELS,
  CONTACT_RELATIONSHIP_LABELS,
  CONTACT_SOURCE_LABELS,
  type Contact,
  type ContactInfluence,
  type ContactRelationshipStrength,
} from '@/types/commercial'
import { ArrowUpDown, Search, Star, Filter, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Return color class based on due date vs today */
function dueDateColorClass(iso?: string | null): string {
  if (!iso) return 'text-muted-foreground'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(iso)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  if (dueDay < today) return 'text-red-500'
  if (dueDay.getTime() === today.getTime()) return 'text-amber-500'
  return 'text-green-500'
}

const INFLUENCE_COLORS: Record<ContactInfluence, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-400',
}

const RELATIONSHIP_COLORS: Record<ContactRelationshipStrength, string> = {
  new: 'text-slate-300 bg-slate-800',
  developing: 'text-cyan-300 bg-cyan-900/50',
  active: 'text-green-300 bg-green-900/50',
  trusted: 'text-purple-300 bg-purple-900/50',
  dormant: 'text-amber-300 bg-amber-900/50',
}

const columnHelper = createColumnHelper<Contact>()

const columns = [
  columnHelper.display({
    id: 'name',
    header: 'Name',
    cell: (info) => {
      const c = info.row.original
      return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
            {c.is_champion && (
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            )}
          </span>
          <Link
            href={`/contacts/${c.id}`}
            className="font-medium hover:underline"
            style={{ color: '#60a5fa' }}
          >
            {c.first_name} {c.last_name}
          </Link>
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = `${rowA.original.last_name} ${rowA.original.first_name}`
      const b = `${rowB.original.last_name} ${rowB.original.first_name}`
      return a.localeCompare(b)
    },
    filterFn: (row, _columnId, filterValue: string) => {
      const name = `${row.original.first_name} ${row.original.last_name}`.toLowerCase()
      const client = (row.original.client_name ?? '').toLowerCase()
      const title = (row.original.title ?? '').toLowerCase()
      const search = filterValue.toLowerCase()
      return name.includes(search) || client.includes(search) || title.includes(search)
    },
  }),
  columnHelper.accessor('client_name', {
    header: 'Client',
    cell: (info) => (
      <Link
        href={`/clients/${info.row.original.client_id}`}
        className="whitespace-nowrap hover:underline"
        style={{ color: '#60a5fa' }}
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('owner_name', {
    header: 'BLU Crew Owner',
    cell: (info) => info.getValue() ?? '—',
    filterFn: 'includesString',
  }),
  columnHelper.accessor('role_type', {
    header: 'Role Type',
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor('influence', {
    header: 'Influence',
    cell: (info) => {
      const val = info.getValue()
      return (
        <span className="flex items-center gap-1.5 text-sm">
          <span className={cn('h-2 w-2 rounded-full', INFLUENCE_COLORS[val])} />
          {CONTACT_INFLUENCE_LABELS[val]}
        </span>
      )
    },
    filterFn: 'equals',
  }),
  columnHelper.accessor('relationship_strength', {
    header: 'Strength',
    cell: (info) => {
      const val = info.getValue()
      return (
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
            RELATIONSHIP_COLORS[val],
          )}
        >
          {CONTACT_RELATIONSHIP_LABELS[val]}
        </span>
      )
    },
    filterFn: 'equals',
  }),
  columnHelper.accessor('source_channel', {
    header: 'Source',
    cell: (info) => {
      const val = info.getValue()
      return val ? CONTACT_SOURCE_LABELS[val] : '—'
    },
  }),
  columnHelper.accessor('last_touch_date', {
    header: 'Last Touch',
    cell: (info) => {
      const val = info.getValue()
      if (!val) return '—'
      return new Date(val).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    },
  }),
  columnHelper.accessor('next_step', {
    header: 'Next Step',
    cell: (info) => (
      <span className="max-w-[180px] truncate text-sm">
        {info.getValue() ?? '—'}
      </span>
    ),
  }),
  columnHelper.accessor('next_step_due_date', {
    header: 'Next Step Due',
    cell: (info) => {
      const val = info.getValue()
      if (!val) return <span className="text-muted-foreground">—</span>
      const color = dueDateColorClass(val)
      return (
        <span className={cn('flex items-center gap-1 text-sm font-medium', color)}>
          <CalendarClock className="h-3.5 w-3.5" />
          {new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.next_step_due_date
      const b = rowB.original.next_step_due_date
      // Nulls sort last
      if (!a && !b) return 0
      if (!a) return 1
      if (!b) return -1
      return a.localeCompare(b)
    },
  }),
  columnHelper.accessor('touch_count', {
    header: 'Touches',
    cell: (info) => (
      <span className="font-mono text-xs">{info.getValue()}</span>
    ),
  }),
]

interface ContactTableProps {
  contacts: Contact[]
}

export function ContactTable({ contacts }: ContactTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'next_step_due_date', desc: false }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [championsOnly, setChampionsOnly] = useState(false)

  const data = useMemo(() => {
    if (championsOnly) return contacts.filter((c) => c.is_champion)
    return contacts
  }, [contacts, championsOnly])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const name = `${row.original.first_name} ${row.original.last_name}`.toLowerCase()
      const client = (row.original.client_name ?? '').toLowerCase()
      const title = (row.original.title ?? '').toLowerCase()
      const search = filterValue.toLowerCase()
      return name.includes(search) || client.includes(search) || title.includes(search)
    },
  })

  // Get unique values for filter dropdowns
  const uniqueInfluences = [...new Set(contacts.map((c) => c.influence))] as ContactInfluence[]
  const uniqueStrengths = [...new Set(contacts.map((c) => c.relationship_strength))] as ContactRelationshipStrength[]

  function setFilterValue(columnId: string, value: string) {
    setColumnFilters((prev) => {
      const existing = prev.filter((f) => f.id !== columnId)
      if (!value) return existing
      return [...existing, { id: columnId, value }]
    })
  }

  const activeInfluenceFilter = columnFilters.find((f) => f.id === 'influence')?.value as string | undefined
  const activeStrengthFilter = columnFilters.find((f) => f.id === 'relationship_strength')?.value as string | undefined

  return (
    <div className="space-y-4">
      {/* Search / filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search name, client, title..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />

          <select
            value={activeInfluenceFilter ?? ''}
            onChange={(e) => setFilterValue('influence', e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Influence</option>
            {uniqueInfluences.map((i) => (
              <option key={i} value={i}>{CONTACT_INFLUENCE_LABELS[i]}</option>
            ))}
          </select>

          <select
            value={activeStrengthFilter ?? ''}
            onChange={(e) => setFilterValue('relationship_strength', e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Strengths</option>
            {uniqueStrengths.map((s) => (
              <option key={s} value={s}>{CONTACT_RELATIONSHIP_LABELS[s]}</option>
            ))}
          </select>

          {/* Champions toggle */}
          <button
            onClick={() => setChampionsOnly(!championsOnly)}
            className={cn(
              'flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
              championsOnly
                ? 'border-amber-600 bg-amber-900/30 text-amber-300'
                : 'border-input text-muted-foreground hover:text-foreground',
            )}
          >
            <Star className={cn('h-3 w-3', championsOnly && 'fill-amber-400')} />
            Champions
          </button>
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {table.getFilteredRowModel().rows.length} contact{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className={cn(
                          'flex items-center gap-1',
                          header.column.getCanSort() && 'cursor-pointer select-none hover:text-foreground',
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No contacts found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border transition-colors hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
