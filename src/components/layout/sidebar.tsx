'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Users,
  Contact,
  Target,
  Briefcase,
  ArrowRightLeft,
  FileCheck,
  TrendingUp,
  CheckSquare,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Contacts', href: '/contacts', icon: Contact },
  { label: 'Pursuits', href: '/pursuits', icon: Target },
  { label: 'Commercial', href: '/commercial', icon: Briefcase },
  { label: 'Handoffs', href: '/handoffs', icon: ArrowRightLeft },
  { label: 'Change Orders', href: '/change-orders', icon: FileCheck },
  { label: 'Growth', href: '/growth', icon: TrendingUp },
  { label: 'Approvals', href: '/approvals', icon: CheckSquare },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Admin', href: '/admin', icon: Settings },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      {/* Branding */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-foreground">
            BLU Crew
          </h1>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Commercial ERP
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-5 py-3">
        <p className="text-[10px] text-muted-foreground">
          v0.1.0 MVP — Phase 1
        </p>
      </div>
    </aside>
  )
}
