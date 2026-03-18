import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ClientCreateForm } from '@/components/client/client-create-form'

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/clients" className="hover:text-foreground">
          Clients
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">New Client</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Create New Client</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          New clients start in Watchlist status. Fill in the details below.
        </p>
      </div>

      <ClientCreateForm />
    </div>
  )
}
