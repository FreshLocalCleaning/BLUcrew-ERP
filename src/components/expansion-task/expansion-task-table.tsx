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
import { EXPANSION_TASK_STATE_LABELS } from '@/lib/state-machines/expansion-task'
import { EXPANSION_TASK_TYPE_LABELS } from '@/types/commercial'
import type { ExpansionTask, ExpansionTaskType } from '@/types/commercial'
import type { ExpansionTaskState } from '@/lib/state-machines/expansion-task'

const columnHelper = createColumnHelper<ExpansionTask>()

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
        href={`/growth/${info.row.original.id}`}
        className="font-mono text-sm hover:underline"
        style={{ color: '#3b82f6' }}
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
  columnHelper.accessor('task_type', {
    header: 'Task Type',
    cell: (info) => (
      <span className="text-sm text-foreground">
        {EXPANSION_TASK_TYPE_LABELS[info.getValue() as ExpansionTaskType] ?? info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('growth_objective', {
    header: 'Objective',
    cell: (info) => {
      const text = info.getValue()
      return (
        <span className="text-sm text-foreground" title={text}>
          {text.length > 60 ? text.slice(0, 60) + '…' : text}
        </span>
      )
    },
  }),
  columnHelper.accessor('due_date', {
    header: 'Due Date',
    cell: (info) => (
      <span className="text-sm text-foreground">{formatDate(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <StatusBadge
        state={info.getValue()}
        label={EXPANSION_TASK_STATE_LABELS[info.getValue() as ExpansionTaskState]}
      />
    ),
  }),
  columnHelper.accessor('next_signal_created', {
    header: 'Signal',
    cell: (info) => (
      <span className={`text-sm ${info.getValue() ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
        {info.getValue() ? 'Created' : '—'}
      </span>
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

interface ExpansionTaskTableProps {
  expansionTasks: ExpansionTask[]
  projectNameMap?: Record<string, string>
}

export function ExpansionTaskTable({ expansionTasks, projectNameMap }: ExpansionTaskTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const data = useMemo(() => expansionTasks, [expansionTasks])

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
          placeholder="Search expansion tasks..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Link
          href="/growth/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Expansion Task
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
                  No expansion tasks found
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
