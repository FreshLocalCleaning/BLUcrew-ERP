'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CommercialHealthProps {
  hygiene: { rate: number; compliant: number; total: number }
  tiers: { A: number; B: number; C: number; unset: number }
  proposalAging: { '0-7': number; '8-14': number; '15-30': number; '30+': number; total: number }
  lossReasons: { reason: string; count: number }[]
}

const AGING_COLORS: Record<string, string> = {
  '0-7': 'bg-green-500',
  '8-14': 'bg-amber-500',
  '15-30': 'bg-orange-500',
  '30+': 'bg-red-500',
}

export function CommercialHealth({ hygiene, tiers, proposalAging, lossReasons }: CommercialHealthProps) {
  const hygienePercent = Math.round(hygiene.rate * 100)
  const totalTiers = tiers.A + tiers.B + tiers.C + tiers.unset

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">Commercial Health</h2>
      <p className="mt-1 text-xs text-muted-foreground">Pipeline governance and commercial metrics</p>

      <div className="mt-4 space-y-6">
        {/* Next-Action Hygiene */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground">Next-Action Hygiene</span>
            <span className={cn('text-sm font-bold', hygienePercent >= 80 ? 'text-green-500' : hygienePercent >= 50 ? 'text-amber-500' : 'text-red-500')}>
              {hygienePercent}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted/50 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', hygienePercent >= 80 ? 'bg-green-500' : hygienePercent >= 50 ? 'bg-amber-500' : 'bg-red-500')}
              style={{ width: `${hygienePercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{hygiene.compliant} of {hygiene.total} records with owner + next action + due date</p>
        </div>

        {/* Client Tiers */}
        <div>
          <span className="text-sm font-medium text-foreground">Client Coverage</span>
          <div className="mt-2 flex gap-2">
            {[
              { label: 'Tier A', count: tiers.A, color: 'bg-green-500/10 text-green-500 border-green-500/30' },
              { label: 'Tier B', count: tiers.B, color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
              { label: 'Tier C', count: tiers.C, color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
            ].map((t) => (
              <Link
                key={t.label}
                href="/clients"
                className={cn('flex-1 rounded-md border p-3 text-center hover:bg-muted/30 transition-colors', t.color)}
              >
                <p className="text-xl font-bold">{t.count}</p>
                <p className="text-[10px] font-medium uppercase">{t.label}</p>
              </Link>
            ))}
          </div>
          {tiers.unset > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{tiers.unset} clients without tier assignment</p>
          )}
        </div>

        {/* Proposal Aging */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Proposal Aging</span>
            <Link href="/proposals" className="text-xs text-primary hover:underline">{proposalAging.total} active</Link>
          </div>
          <div className="flex gap-1.5">
            {(['0-7', '8-14', '15-30', '30+'] as const).map((bucket) => {
              const count = proposalAging[bucket]
              return (
                <Link
                  key={bucket}
                  href="/proposals"
                  className="flex-1 rounded-md border border-border p-2 text-center hover:bg-muted/30 transition-colors"
                >
                  <div className={cn('mx-auto mb-1 h-1.5 w-8 rounded-full', AGING_COLORS[bucket])} />
                  <p className="text-lg font-bold text-foreground">{count}</p>
                  <p className="text-[10px] text-muted-foreground">{bucket}d</p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Loss Reasons */}
        {lossReasons.length > 0 && (
          <div>
            <span className="text-sm font-medium text-foreground">Loss Reasons</span>
            <div className="mt-2 space-y-1.5">
              {lossReasons.map((lr) => {
                const maxCount = Math.max(...lossReasons.map((r) => r.count), 1)
                const pct = (lr.count / maxCount) * 100
                return (
                  <div key={lr.reason} className="flex items-center gap-2">
                    <span className="w-24 truncate text-xs text-muted-foreground">{lr.reason}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                      <div className="h-full rounded-full bg-red-500/60" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-foreground w-4 text-right">{lr.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
