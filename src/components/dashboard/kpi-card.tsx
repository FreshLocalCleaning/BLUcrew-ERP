'use client'

interface KpiCardProps {
  label: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export function KpiCard({ label, value, subtitle, icon: Icon, color }: KpiCardProps) {
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
