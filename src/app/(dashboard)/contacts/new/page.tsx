import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ContactCreateForm } from '@/components/contact/contact-create-form'
import { listClients } from '@/lib/db/clients'
import { seedClients, seedContacts } from '@/lib/db/seed'

export default function NewContactPage() {
  seedClients()
  seedContacts()

  const clients = listClients()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/contacts" className="hover:text-foreground">
          Contacts
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">New Contact</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Add New Contact</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Map a new contact to a client for relationship multi-threading.
        </p>
      </div>

      <ContactCreateForm clients={clients} />
    </div>
  )
}
