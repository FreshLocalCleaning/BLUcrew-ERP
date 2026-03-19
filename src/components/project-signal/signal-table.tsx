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
import { PROJECT_SIGNAL_STATE_LABELS } from '@/lib/state-machines/project-signal'
import {
  PROJECT_SIGNAL_TYPE_LABELS,
  PROJECT_SIGNAL_GATE_LABELS,
  type ProjectSignal,
} from '@/types/commercial'
import { ArrowUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const columnHelper = createColumnHelper<ProjectSignal>()

const columns = [
  columnHelper.accessor('project_identity', {
    header: 'Project',
    cell: (info) => (
      <Link
        href={`/project-signals/${info.row.original.id}`}
        className="font-medium text-primary hover:underline"
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
        label={PROJECT_SIGNAL_STATE_LABELS[info.getValue()]}
      />
    ),
  }),
  columnHelper.accessor('signal_type', {
    header: 'Signal Type',
    cell: (info) => PROJECT_SIGNAL_TYPE_LABELS[info.getValue()],
  }),
  columnHelper.accessor('linked_client_name', {
    header: 'Client',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('linked_contact_name', {
    header: 'Contact',
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor('gate_outcome', {
    header: 'Gate',
    cell: (info) => (
      <StatusBadge
        state={info.getValue()}
        label={PROJECT_SIGNAL_GATE_LABELS[info.getValue()]}
      />
    ),
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

interface SignalTableProps {
  signals: ProjectSignal[]
}

export function SignalTable({ signals }: SignalTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const data = useMemo(() => signals, [signals])

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
            placeholder="Filter signals..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} signal{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
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
                  No project signals found.
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
