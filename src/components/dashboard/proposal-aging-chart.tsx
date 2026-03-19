'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ProposalAgingData {
  '0-7': number
  '8-14': number
  '15-30': number
  '30+': number
  total: number
}

interface ProposalAgingChartProps {
  data: ProposalAgingData
}

const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444']

export function ProposalAgingChart({ data }: ProposalAgingChartProps) {
  const chartData = [
    { bucket: '0-7 days', count: data['0-7'] },
    { bucket: '8-14 days', count: data['8-14'] },
    { bucket: '15-30 days', count: data['15-30'] },
    { bucket: '30+ days', count: data['30+'] },
  ]

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">Proposal Aging</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Active proposals by age bucket ({data.total} total)
      </p>
      <div className="mt-4 h-48" style={{ minWidth: 200, minHeight: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
