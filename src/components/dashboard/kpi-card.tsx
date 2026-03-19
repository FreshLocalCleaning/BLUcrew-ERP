'use client'

import {
  Zap,
  Clock,
  TrendingUp,
  Target,
  FileText,
  Users,
  Truck,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  zap: Zap,
  clock: Clock,
  trending_up: TrendingUp,
  target: Target,
  file_text: FileText,
  users: Users,
  truck: Truck,
}

interface KpiCardProps {
  label: string
  value: string
  subtitle?: string
  icon: string
  color: string
}

export function KpiCard({ label, value, subtitle, icon, color }: KpiCardProps) {
  const Icon = ICON_MAP[icon] ?? Zap

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}
