import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Star } from 'lucide-react'
import { getContact } from '@/lib/db/contacts'
import { getAuditLog } from '@/lib/db/json-db'
import { ContactDetail } from '@/components/contact/contact-detail'
import { seedClients, seedContacts } from '@/lib/db/seed'

interface ContactDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params

  seedClients()
  seedContacts()

  const contact = getContact(id)
  if (!contact) {
    notFound()
  }

  const auditLog = getAuditLog('contacts', id)

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/contacts" className="hover:text-foreground">
          Contacts
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/clients/${contact.client_id}`} className="hover:text-foreground">
          {contact.client_name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">
          {contact.first_name} {contact.last_name}
        </span>
      </nav>

      {/* Page heading */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            {contact.first_name} {contact.last_name}
          </h1>
          {contact.is_champion && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-300">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              BLU Champion
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-mono">{contact.reference_id}</span>
          {contact.title && (
            <span> · {contact.title}</span>
          )}
          {' · '}
          <Link href={`/clients/${contact.client_id}`} className="text-primary hover:underline">
            {contact.client_name}
          </Link>
        </p>
      </div>

      {/* Detail component */}
      <ContactDetail contact={contact} auditLog={auditLog} />
    </div>
  )
}
