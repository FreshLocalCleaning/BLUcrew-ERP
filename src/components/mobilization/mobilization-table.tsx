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
} from '@tanstack/react-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { MOBILIZATION_STATE_LABELS } from '@/lib/state-machines/mobilization'
import type { Mobilization } from '@/types/commercial'
import type { MobilizationState } from '@/lib/state-machines/mobilization'

const columnHelper = createColumnHelper<Mobilization>()

function readinessPercent(checklist: Mobilization['readiness_checklist']): number {
  const fields = [
    checklist.crew_confirmed,
    checklist.equipment_loaded,
    checklist.travel_booked,
    checklist.lodging_booked,
    checklist.per_diem_approved,
  ]
  const done = fields.filter(Boolean).length
  return Math.round((done / fields.length) * 100)
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const columns = [
  columnHelper.accessor('reference_id', {
    header: 'Ref ID',
    cell: (info) => (
      <Link
        href={`/mobilizations/${info.row.original.id}`}
        className="font-mono text-sm text-primary hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('stage_name', {
    header: 'Stage Name',
    cell: (info) => <span className="text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <StatusBadge
        state={info.getValue()}
        label={MOBILIZATION_STATE_LABELS[info.getValue()]}
      />
    ),
  }),
  columnHelper.accessor('crew_lead_id', {
    header: 'Crew Lead',
    cell: (info) => {
      const id = info.getValue()
      if (!id) return <span className="text-sm text-muted-foreground">—</span>
      // Show readable names for known crew leads
      const names: Record<string, string> = { 'lead-1': 'Lead 1', 'lead-2': 'Lead 2', cullen: 'Cullen' }
      return <span className="text-sm">{names[id] ?? id}</span>
    },
  }),
  columnHelper.accessor('readiness_checklist', {
    header: 'Readiness',
    cell: (info) => {
      const pct = readinessPercent(info.getValue())
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-muted">
            <div
              className={`h-2 rounded-full ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
      )
    },
    enableSorting: false,
  }),
  columnHelper.accessor('requested_start_date', {
    header: 'Start Date',
    cell: (info) => <span className="text-sm">{formatDate(info.getValue())}</span>,
  }),
  columnHelper.accessor('travel_posture', {
    header: 'Travel',
    cell: (info) => (
      <span className="text-sm capitalize">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('next_action', {
    header: 'Next Action',
    cell: (info) => (
      <span className="text-sm text-muted-foreground">{info.getValue() ?? '—'}</span>
    ),
  }),
]

interface MobilizationTableProps {
  mobilizations: Mobilization[]
  showProjectLink?: boolean
}

export function MobilizationTable({ mobilizations, showProjectLink }: MobilizationTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data: mobilizations,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search mobilizations..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Link
          href="/mobilizations/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Mobilization
        </Link>
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
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
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No mobilizations found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30">
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

      <p className="text-xs text-muted-foreground">
        {mobilizations.length} mobilization{mobilizations.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
