'use client'

import Link from 'next/link'
import type { PipelineStage } from '@/lib/analytics/kpi-engine'
import { cn } from '@/lib/utils'

const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#6366f1', '#ec4899']

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
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">Pipeline Overview</h2>
      <p className="mt-1 text-xs text-muted-foreground">Active records at each stage — click to navigate</p>
      <div className="mt-4 space-y-3">
        {data.map((stage, i) => {
          const pct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
          return (
            <Link
              key={stage.stage}
              href={stage.href}
              className="block rounded-md hover:bg-muted/30 transition-colors p-2 -mx-2"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{stage.label}</span>
                <div className="flex items-center gap-2">
                  {stage.value > 0 && (
                    <span className="text-xs text-muted-foreground">{formatValue(stage.value)}</span>
                  )}
                  <span className="text-sm font-bold text-foreground">{stage.count}</span>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(pct, stage.count > 0 ? 4 : 0)}%`, backgroundColor: COLORS[i % COLORS.length] }}
                />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
