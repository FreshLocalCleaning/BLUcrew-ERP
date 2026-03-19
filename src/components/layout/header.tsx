'use client'

import { Search, Plus, Bell, User } from 'lucide-react'
import { useState } from 'react'

const QUICK_CREATE_ITEMS = [
  'Client',
  'Pursuit',
  'Estimate',
  'Proposal',
  'Change Order',
  'Expansion',
] as const

export function Header() {
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search clients, pursuits, proposals..."
          className="w-full rounded-md border border-input bg-background py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Quick Create */}
        <div className="relative">
          <button
            onClick={() => setQuickCreateOpen(!quickCreateOpen)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Quick Create
          </button>
          {quickCreateOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-card py-1 shadow-lg">
              {QUICK_CREATE_ITEMS.map((item) => (
                <button
                  key={item}
                  onClick={() => setQuickCreateOpen(false)}
                  className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-sidebar-accent"
                >
                  <Plus className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="relative rounded-md p-2 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
        </button>

        {/* User avatar placeholder */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
