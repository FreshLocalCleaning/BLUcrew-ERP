import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ContactTable } from '@/components/contact/contact-table'
import { MultiThreadingHealth } from '@/components/contact/multi-threading-health'
import { listContacts } from '@/lib/db/contacts'
import { listClients } from '@/lib/db/clients'
import { seedClients, seedContacts } from '@/lib/db/seed'

export default function ContactsPage() {
  seedClients()
  seedContacts()

  const contacts = listContacts()
  const clients = listClients()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Relationship mapping across all clients — CORE-01
          </p>
        </div>
        <Link
          href="/contacts/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Contact
        </Link>
      </div>

      {/* Multi-Threading Health Cards */}
      <MultiThreadingHealth clients={clients} contacts={contacts} />

      {/* Table */}
      <ContactTable contacts={contacts} />
    </div>
  )
}
