import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { PursuitCreateForm } from '@/components/pursuit/pursuit-create-form'
import { listClients } from '@/lib/db/clients'
import { listContacts } from '@/lib/db/contacts'
import { seedClients, seedContacts } from '@/lib/db/seed'

export default function NewPursuitPage() {
  // Ensure seed data exists
  seedClients()
  seedContacts()

  const clients = listClients()
  const contacts = listContacts()

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/pursuits" className="hover:text-foreground">
          Pursuits
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">New Pursuit</span>
      </nav>

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Pursuit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new project pursuit to track from signal to estimate
        </p>
      </div>

      {/* Form */}
      <PursuitCreateForm clients={clients} contacts={contacts} />
    </div>
  )
}
