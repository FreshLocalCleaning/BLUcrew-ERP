import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ClientTable } from '@/components/client/client-table'
import { listClients } from '@/lib/db/clients'
import { seedClients, seedContacts, seedPursuits } from '@/lib/db/seed'

export default function ClientsPage() {
  // Ensure seed data exists on first load
  seedClients()
  seedContacts()
  seedPursuits()
  const clients = listClients()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your client relationships and pipeline
          </p>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Client
        </Link>
      </div>

      {/* Table */}
      <ClientTable clients={clients} />
    </div>
  )
}
