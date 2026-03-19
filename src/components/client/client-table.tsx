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
import { StatusBadge } from '@/components/shared/status-badge'
import { CLIENT_STATE_LABELS } from '@/lib/state-machines/client'
import {
  CLIENT_TIER_LABELS,
  CLIENT_MARKET_LABELS,
  CLIENT_RELATIONSHIP_LABELS,
  type Client,
  type Contact,
  type ClientTier,
} from '@/types/commercial'
import { ArrowUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTierForContacts, getPrimaryContact } from '@/lib/contacts/utils'

/** Extended client row with computed fields for display */
interface ClientRow extends Client {
  _primaryContact?: Contact
  _computedTier: ClientTier
}

const columnHelper = createColumnHelper<ClientRow>()

const columns = [
  columnHelper.accessor('name', {
    header: 'Company Name',
    cell: (info) => (
      <Link
        href={`/clients/${info.row.original.id}`}
        className="font-medium hover:underline"
        style={{ color: '#60a5fa' }}
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('reference_id', {
    header: 'Ref ID',
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <StatusBadge
        state={info.getValue()}
        label={CLIENT_STATE_LABELS[info.getValue()]}
      />
    ),
  }),
  columnHelper.accessor('_computedTier', {
    header: 'Tier',
    cell: (info) => {
      const val = info.getValue()
      const colors: Record<ClientTier, string> = {
        A: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        B: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        C: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      }
      return (
        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', colors[val])}>
          {CLIENT_TIER_LABELS[val]}
        </span>
      )
    },
  }),
  columnHelper.accessor('market', {
    header: 'Market',
    cell: (info) => {
      const val = info.getValue()
      return val ? CLIENT_MARKET_LABELS[val] : '—'
    },
  }),
  columnHelper.accessor('relationship_strength', {
    header: 'Relationship',
    cell: (info) => {
      const val = info.getValue()
      return val ? CLIENT_RELATIONSHIP_LABELS[val] : '—'
    },
  }),
  columnHelper.accessor('_primaryContact', {
    header: 'Primary Contact',
    cell: (info) => {
      const contact = info.getValue()
      if (!contact) return <span className="text-muted-foreground">—</span>
      return (
        <Link
          href={`/contacts/${contact.id}`}
          className="font-medium hover:underline"
          style={{ color: '#60a5fa' }}
        >
          {contact.first_name} {contact.last_name}
        </Link>
      )
    },
  }),
  columnHelper.accessor('next_action', {
    header: 'Next Action',
    cell: (info) => (
      <span className="max-w-[200px] truncate text-sm">
        {info.getValue() ?? '—'}
      </span>
    ),
  }),
  columnHelper.accessor('next_action_date', {
    header: 'Due Date',
    cell: (info) => {
      const val = info.getValue()
      if (!val) return '—'
      return new Date(val).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    },
  }),
]

interface ClientTableProps {
  clients: Client[]
  contactsByClient: Record<string, Contact[]>
}

export function ClientTable({ clients, contactsByClient }: ClientTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const data = useMemo<ClientRow[]>(() => {
    return clients.map((client) => {
      const clientContacts = contactsByClient[client.id] ?? []
      return {
        ...client,
        _primaryContact: getPrimaryContact(clientContacts),
        _computedTier: getTierForContacts(clientContacts),
      }
    })
  }, [clients, contactsByClient])

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
  })

  return (
    <div className="space-y-4">
      {/* Search / filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter clients..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} client{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
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
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
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
                  No clients found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border transition-colors hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
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
