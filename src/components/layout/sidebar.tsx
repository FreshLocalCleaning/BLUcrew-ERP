'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Users,
  Contact,
  Target,
  Calculator,
  FileText,
  Briefcase,
  ArrowRightLeft,
  FolderKanban,
  FileCheck,
  TrendingUp,
  CheckSquare,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Home', href: '/', icon: Home },
    ],
  },
  {
    title: 'Pipeline',
    items: [
      { label: 'Clients', href: '/clients', icon: Users },
      { label: 'Contacts', href: '/contacts', icon: Contact },
      { label: 'Signals', href: '/project-signals', icon: Zap },
      { label: 'Pursuits', href: '/pursuits', icon: Target },
    ],
  },
  {
    title: 'Commercial',
    items: [
      { label: 'Estimates', href: '/estimates', icon: Calculator },
      { label: 'Proposals', href: '/proposals', icon: FileText },
    ],
  },
  {
    title: 'Handoffs',
    items: [
      { label: 'Handoffs', href: '/handoffs', icon: ArrowRightLeft },
    ],
  },
  {
    title: 'Projects',
    items: [
      { label: 'Projects', href: '/projects', icon: FolderKanban },
      { label: 'Mobilizations', href: '/mobilizations', icon: Briefcase },
      { label: 'Change Orders', href: '/change-orders', icon: FileCheck },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Growth', href: '/growth', icon: TrendingUp },
      { label: 'Approvals', href: '/approvals', icon: CheckSquare },
      { label: 'Reports', href: '/reports', icon: BarChart3 },
      { label: 'Admin', href: '/admin', icon: Settings },
    ],
  },
]

interface SidebarProps {
  approvalCount?: number
}

export function Sidebar({ approvalCount }: SidebarProps) {
  const pathname = usePathname()

  // Inject badge count into the Approvals nav item
  const sections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.map(item =>
      item.href === '/approvals' && approvalCount
        ? { ...item, badge: approvalCount }
        : item
    ),
  }))

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
        <div className="space-y-4">
          {sections.map((section, si) => (
            <div key={si}>
              {section.title && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {section.title}
                </p>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
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
                        <span className="flex-1">{item.label}</span>
                        {item.badge != null && item.badge > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
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
