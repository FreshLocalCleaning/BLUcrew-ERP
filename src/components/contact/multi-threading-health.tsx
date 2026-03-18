'use client'

import { cn } from '@/lib/utils'
import { Users, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Client, Contact, ContactLayer } from '@/types/commercial'

interface MultiThreadingHealthProps {
  clients: Client[]
  contacts: Contact[]
}

interface ClientHealth {
  client: Client
  contactCount: number
  layersCovered: Set<ContactLayer>
  meetsThreshold: boolean
}

export function MultiThreadingHealth({ clients, contacts }: MultiThreadingHealthProps) {
  // Only show active clients (Tier A/B that are not archived/dormant)
  const activeClients = clients.filter(
    (c) => c.tier && ['A', 'B'].includes(c.tier) && !['archived', 'dormant'].includes(c.status),
  )

  const healthData: ClientHealth[] = activeClients.map((client) => {
    const clientContacts = contacts.filter((c) => c.client_id === client.id)
    const layersCovered = new Set<ContactLayer>(clientContacts.map((c) => c.layer))
    // Tier A: 3+ contacts across 2+ layers. Tier B: apply same standard.
    const meetsThreshold = clientContacts.length >= 3 && layersCovered.size >= 2
    return {
      client,
      contactCount: clientContacts.length,
      layersCovered,
      meetsThreshold,
    }
  })

  if (healthData.length === 0) return null

  const metCount = healthData.filter((h) => h.meetsThreshold).length
  const totalCount = healthData.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Client Multi-Threading Health
        </h2>
        <span className="text-xs text-muted-foreground">
          {metCount}/{totalCount} clients meeting coverage threshold
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {healthData.map((h) => (
          <div
            key={h.client.id}
            className={cn(
              'rounded-lg border p-3',
              h.meetsThreshold
                ? 'border-green-800/50 bg-green-950/20'
                : 'border-amber-800/50 bg-amber-950/20',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground truncate mr-2">
                {h.client.name}
              </span>
              {h.meetsThreshold ? (
                <span className="flex items-center gap-1 shrink-0 rounded-full bg-green-900/50 px-2 py-0.5 text-[10px] font-medium text-green-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Met
                </span>
              ) : (
                <span className="flex items-center gap-1 shrink-0 rounded-full bg-amber-900/50 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  Needs coverage
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {h.contactCount} contact{h.contactCount !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {h.layersCovered.size} layer{h.layersCovered.size !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
