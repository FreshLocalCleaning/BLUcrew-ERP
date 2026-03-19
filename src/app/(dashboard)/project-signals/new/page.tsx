import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { SignalCreateForm } from '@/components/project-signal/signal-create-form'
import { listClients } from '@/lib/db/clients'
import { listContacts } from '@/lib/db/contacts'

export default function NewProjectSignalPage() {
  const clients = listClients()
  const contacts = listContacts()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/project-signals" className="hover:text-foreground">
          Project Signals
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">New Signal</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Create New Project Signal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          New signals start in Received status. The signal must pass a gate review before a Pursuit can be created.
        </p>
      </div>

      <SignalCreateForm clients={clients} contacts={contacts} />
    </div>
  )
}
