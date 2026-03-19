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
import { AWARD_HANDOFF_STATE_LABELS } from '@/lib/state-machines/award-handoff'
import type { AwardHandoff } from '@/types/commercial'
import { ArrowUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const columnHelper = createColumnHelper<AwardHandoff>()

function compliancePercent(tracker: AwardHandoff['compliance_tracker']): string {
  if (!tracker || tracker.length === 0) return '—'
  const done = tracker.filter((d) => d.status !== 'pending').length
  return `${Math.round((done / tracker.length) * 100)}%`
}

function openBlockerCount(blockers: AwardHandoff['startup_blockers']): number {
  if (!blockers) return 0
  return blockers.filter((b) => b.status === 'open').length
}

const columns = [
  columnHelper.accessor('reference_id', {
    header: 'Ref ID',
    cell: (info) => (
      <Link
        href={`/handoffs/${info.row.original.id}`}
        className="font-mono text-xs text-primary hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('project_name', {
    header: 'Project',
    cell: (info) => (
      <Link
        href={`/handoffs/${info.row.original.id}`}
        className="font-medium text-foreground hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('linked_client_id', {
    header: 'Client',
    cell: (info) => {
      const id = info.getValue()
      const meta = info.table.options.meta as Record<string, Record<string, string>> | undefined
      const name = meta?.clientNameMap?.[id] ?? id
      return (
        <Link
          href={`/clients/${id}`}
          className="text-sm text-primary hover:underline"
        >
          {name}
        </Link>
      )
    },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <StatusBadge
        state={info.getValue()}
        label={AWARD_HANDOFF_STATE_LABELS[info.getValue()]}
      />
    ),
  }),
  columnHelper.accessor('pm_claim_user_id', {
    header: 'PM Assigned',
    cell: (info) => {
      const id = info.getValue()
      if (!id) return <span className="text-sm text-muted-foreground">—</span>
      const pmNames: Record<string, string> = { cullen: 'Cullen', antonio: 'Antonio', system: 'System' }
      return <span className="text-sm">{pmNames[id] ?? id}</span>
    },
  }),
  columnHelper.accessor('compliance_tracker', {
    header: 'Compliance',
    cell: (info) => (
      <span className="text-sm">{compliancePercent(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('startup_blockers', {
    header: 'Blockers',
    cell: (info) => {
      const count = openBlockerCount(info.getValue())
      return (
        <span className={cn('text-sm', count > 0 ? 'font-medium text-amber-400' : 'text-muted-foreground')}>
          {count > 0 ? `${count} open` : 'None'}
        </span>
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
]

interface AwardHandoffTableProps {
  awardHandoffs: AwardHandoff[]
  clientNameMap?: Record<string, string>
}

export function AwardHandoffTable({ awardHandoffs, clientNameMap }: AwardHandoffTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const data = useMemo(() => awardHandoffs, [awardHandoffs])

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
    meta: { clientNameMap: clientNameMap ?? {} },
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
            placeholder="Filter handoffs..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} handoff{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
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
                  No handoffs found.
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
