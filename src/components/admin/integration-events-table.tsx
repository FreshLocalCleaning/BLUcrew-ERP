'use client'

import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { StatusBadge } from '@/components/shared/status-badge'
import type { IntegrationEvent } from '@/lib/db/json-db'

const columnHelper = createColumnHelper<IntegrationEvent>()

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  sent: 'Sent',
  failed: 'Failed',
  manual_override: 'Manual Override',
}

const columns = [
  columnHelper.accessor('event_type', {
    header: 'Event Type',
    cell: (info) => (
      <span className="font-mono text-xs text-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('source_entity', {
    header: 'Source',
    cell: (info) => (
      <span className="text-sm text-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('target_system', {
    header: 'System',
    cell: (info) => (
      <span className="text-sm capitalize text-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <StatusBadge
        state={info.getValue()}
        label={STATUS_LABELS[info.getValue()] ?? info.getValue()}
      />
    ),
  }),
  columnHelper.accessor('timestamp', {
    header: 'Timestamp',
    cell: (info) => (
      <span className="text-xs text-muted-foreground">{formatTimestamp(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('retry_count', {
    header: 'Retries',
    cell: (info) => (
      <span className="text-sm text-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('failure_reason', {
    header: 'Failure',
    cell: (info) => (
      <span className="text-xs text-red-600 truncate max-w-[150px] block">
        {info.getValue() ?? '—'}
      </span>
    ),
  }),
]

interface IntegrationEventsTableProps {
  events: IntegrationEvent[]
  onRetry?: (eventId: string) => void
  onOverride?: (eventId: string) => void
}

export function IntegrationEventsTable({ events, onRetry, onOverride }: IntegrationEventsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [systemFilter, setSystemFilter] = useState<string>('')

  const filtered = useMemo(() => {
    let result = events
    if (statusFilter) result = result.filter((e) => e.status === statusFilter)
    if (systemFilter) result = result.filter((e) => e.target_system === systemFilter)
    return result
  }, [events, statusFilter, systemFilter])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // Summary cards
  const todayStr = new Date().toISOString().split('T')[0]!
  const todayEvents = events.filter((e) => e.timestamp.startsWith(todayStr))
  const failedCount = events.filter((e) => e.status === 'failed').length
  const overrideCount = events.filter((e) => e.status === 'manual_override').length

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Events Today</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{todayEvents.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{failedCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Manual Overrides</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{overrideCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="manual_override">Manual Override</option>
        </select>
        <select
          value={systemFilter}
          onChange={(e) => setSystemFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Systems</option>
          <option value="sharepoint">SharePoint</option>
          <option value="teams">Teams</option>
          <option value="jobber">Jobber</option>
          <option value="quickbooks">QuickBooks</option>
          <option value="gusto">Gusto</option>
          <option value="outlook">Outlook</option>
          <option value="internal">Internal</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No integration events found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {row.original.status === 'failed' && row.original.retry_count < 3 && onRetry && (
                        <button
                          onClick={() => onRetry(row.original.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200"
                        >
                          Retry
                        </button>
                      )}
                      {row.original.status === 'failed' && onOverride && (
                        <button
                          onClick={() => onOverride(row.original.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 border border-amber-200"
                        >
                          Override
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
