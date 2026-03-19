import Link from 'next/link'
import { Plug, Settings, Shield } from 'lucide-react'

const ADMIN_SECTIONS = [
  {
    label: 'Integrations',
    description: 'Monitor and manage external system events — SharePoint, Teams, Jobber, QuickBooks, Gusto, Outlook',
    href: '/admin/integrations',
    icon: Plug,
  },
]

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          System administration, integrations, and configuration
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-lg border border-border bg-card p-6 hover:bg-muted/30 transition-colors"
            >
              <Icon className="h-8 w-8 text-primary" />
              <h2 className="mt-3 text-lg font-semibold text-foreground">{section.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
