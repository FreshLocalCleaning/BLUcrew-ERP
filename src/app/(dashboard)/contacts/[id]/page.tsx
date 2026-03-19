import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
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
        <h1 className="text-2xl font-bold text-foreground">
          {contact.first_name} {contact.last_name}
        </h1>
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
