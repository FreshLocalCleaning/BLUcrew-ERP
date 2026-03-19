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
import { CHANGE_ORDER_STATE_LABELS } from '@/lib/state-machines/change-order'
import { CHANGE_ORDER_ORIGIN_LABELS } from '@/types/commercial'
import type { ChangeOrder, ChangeOrderOrigin } from '@/types/commercial'
import type { ChangeOrderState } from '@/lib/state-machines/change-order'

const columnHelper = createColumnHelper<ChangeOrder>()

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  const prefix = value >= 0 ? '+' : ''
  return prefix + new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

const columns = [
  columnHelper.accessor('reference_id', {
    header: 'Ref ID',
    cell: (info) => (
      <Link
        href={`/change-orders/${info.row.original.id}`}
        className="font-mono text-sm text-primary hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('linked_project_id', {
    header: 'Project',
    cell: (info) => {
      const id = info.getValue()
      const meta = info.table.options.meta as Record<string, Record<string, string>> | undefined
      const name = meta?.projectNameMap?.[id] ?? id.slice(0, 8) + '…'
      return (
        <Link
          href={`/projects/${id}`}
          className="text-sm text-primary hover:underline"
        >
          {name}
        </Link>
      )
    },
  }),
  columnHelper.accessor('origin', {
    header: 'Origin',
    cell: (info) => (
      <span className="text-sm text-foreground">
        {CHANGE_ORDER_ORIGIN_LABELS[info.getValue() as ChangeOrderOrigin] ?? info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('scope_delta', {
    header: 'Scope Summary',
    cell: (info) => {
      const text = info.getValue()
      return (
        <span className="text-sm text-foreground" title={text}>
          {text.length > 60 ? text.slice(0, 60) + '…' : text}
        </span>
      )
    },
  }),
  columnHelper.accessor('pricing_delta', {
    header: 'Pricing Delta',
    cell: (info) => {
      const delta = info.getValue()
      if (!delta) return <span className="text-sm text-muted-foreground">—</span>
      return (
        <span className={`text-sm font-medium ${delta.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(delta.delta)}
        </span>
      )
    },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <StatusBadge
        state={info.getValue()}
        label={CHANGE_ORDER_STATE_LABELS[info.getValue() as ChangeOrderState]}
      />
    ),
  }),
  columnHelper.accessor('priced_by', {
    header: 'Priced By',
    cell: (info) => (
      <span className="text-sm text-foreground">{info.getValue() ?? '—'}</span>
    ),
  }),
  columnHelper.accessor('next_action', {
    header: 'Next Action',
    cell: (info) => (
      <span className="text-sm text-muted-foreground">
        {info.getValue() ?? '—'}
      </span>
    ),
  }),
]

interface ChangeOrderTableProps {
  changeOrders: ChangeOrder[]
  projectNameMap?: Record<string, string>
}

export function ChangeOrderTable({ changeOrders, projectNameMap }: ChangeOrderTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const data = useMemo(() => changeOrders, [changeOrders])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: { projectNameMap: projectNameMap ?? {} },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search change orders..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Link
          href="/change-orders/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Change Order
        </Link>
      </div>

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
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No change orders found
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
