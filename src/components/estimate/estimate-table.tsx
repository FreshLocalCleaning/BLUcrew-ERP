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
import { ESTIMATE_STATUS_LABELS } from '@/lib/state-machines/estimate'
import type { Estimate } from '@/types/commercial'
import { ESTIMATE_TIER_LABEL_MAP } from '@/types/commercial'
import { ArrowUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const columnHelper = createColumnHelper<Estimate>()

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const columns = [
  columnHelper.accessor('project_name', {
    header: 'Project Name',
    cell: (info) => (
      <Link
        href={`/estimates/${info.row.original.id}`}
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
  columnHelper.accessor('linked_client_name', {
    header: 'Client',
    cell: (info) => (
      <Link
        href={`/clients/${info.row.original.linked_client_id}`}
        className="text-sm text-primary hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <StatusBadge
        state={info.getValue()}
        label={ESTIMATE_STATUS_LABELS[info.getValue()]}
      />
    ),
  }),
  columnHelper.accessor('build_type', {
    header: 'Build Type',
    cell: (info) => {
      const val = info.getValue()
      return val ? val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—'
    },
  }),
  columnHelper.accessor('square_footage', {
    header: 'SF',
    cell: (info) => {
      const val = info.getValue()
      return val ? val.toLocaleString() : '—'
    },
  }),
  columnHelper.accessor('tier_index', {
    header: 'Tier',
    cell: (info) => {
      const val = info.getValue()
      return val != null ? ESTIMATE_TIER_LABEL_MAP[val] ?? '—' : '—'
    },
  }),
  columnHelper.accessor('pricing_summary', {
    header: 'Total',
    cell: (info) => {
      const summary = info.getValue()
      return summary ? formatCurrency(summary.grand_total) : '—'
    },
  }),
  columnHelper.accessor('version', {
    header: 'Ver',
    cell: (info) => `v${info.getValue()}`,
  }),
]

interface EstimateTableProps {
  estimates: Estimate[]
}

export function EstimateTable({ estimates }: EstimateTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const data = useMemo(() => estimates, [estimates])

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
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter estimates..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} estimate{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
        </span>
      </div>

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
                  No estimates found.
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
