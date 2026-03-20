'use client'

import React from 'react'
import Link from 'next/link'
import type { PipelineStage } from '@/lib/analytics/kpi-engine'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  signals:   { bg: 'bg-blue-900/30',    text: 'text-blue-300',    border: 'border-blue-700/50',   dot: 'bg-blue-400' },
  pursuits:  { bg: 'bg-cyan-900/30',    text: 'text-cyan-300',    border: 'border-cyan-700/50',   dot: 'bg-cyan-400' },
  estimates: { bg: 'bg-violet-900/30',  text: 'text-violet-300',  border: 'border-violet-700/50', dot: 'bg-violet-400' },
  proposals: { bg: 'bg-amber-900/30',   text: 'text-amber-300',   border: 'border-amber-700/50',  dot: 'bg-amber-400' },
  awards:    { bg: 'bg-emerald-900/30', text: 'text-emerald-300', border: 'border-emerald-700/50',dot: 'bg-emerald-400' },
  projects:  { bg: 'bg-indigo-900/30',  text: 'text-indigo-300',  border: 'border-indigo-700/50', dot: 'bg-indigo-400' },
  in_field:  { bg: 'bg-pink-900/30',    text: 'text-pink-300',    border: 'border-pink-700/50',   dot: 'bg-pink-400' },
}

function getStageColor(stage: string) {
  // Match by stage key from the pipeline data
  const key = stage.toLowerCase().replace(/\s+/g, '_')
  return STAGE_COLORS[key] ?? { bg: 'bg-slate-900/30', text: 'text-slate-300', border: 'border-slate-700/50', dot: 'bg-slate-400' }
}

function formatValue(v: number): string {
  if (v === 0) return ''
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

interface PipelineChartProps {
  data: PipelineStage[]
}

export function PipelineChart({ data }: PipelineChartProps) {
  const totalRecords = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Pipeline Overview</h2>
          <p className="mt-1 text-xs text-muted-foreground">Active records at each stage — click to navigate</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {totalRecords} active
        </span>
      </div>

      {/* Funnel stages */}
      <div className="mt-5 grid gap-1" style={{ gridTemplateColumns: data.map(() => '1fr').join(' auto ') }}>
        {data.map((stage, i) => {
          const colors = getStageColor(stage.stage)
          const hasRecords = stage.count > 0

          return (
            <React.Fragment key={stage.stage}>
              <Link
                href={stage.href}
                className={cn(
                  'group relative flex flex-col items-center justify-center rounded-lg border px-2 py-5 transition-all hover:scale-[1.03]',
                  hasRecords ? colors.border : 'border-border',
                  hasRecords ? colors.bg : 'bg-card',
                )}
              >
                {/* Count */}
                <span className={cn(
                  'text-3xl font-bold',
                  hasRecords ? colors.text : 'text-muted-foreground/50',
                )}>
                  {stage.count}
                </span>

                {/* Label */}
                <span className={cn(
                  'mt-1.5 text-xs font-medium text-center leading-tight',
                  hasRecords ? colors.text : 'text-muted-foreground/60',
                )}>
                  {stage.label}
                </span>

                {/* Value */}
                {stage.value > 0 && (
                  <span className="mt-1 text-[10px] text-muted-foreground">
                    {formatValue(stage.value)}
                  </span>
                )}

                {/* Active dot indicator */}
                {hasRecords && (
                  <span className={cn('absolute top-2 right-2 h-2 w-2 rounded-full', colors.dot)} />
                )}
              </Link>

              {/* Arrow between stages */}
              {i < data.length - 1 && (
                <div className="flex items-center justify-center">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
