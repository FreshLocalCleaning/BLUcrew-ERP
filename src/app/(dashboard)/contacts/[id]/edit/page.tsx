import { redirect } from 'next/navigation'

interface ContactEditPageProps {
  params: Promise<{ id: string }>
}

/**
 * Redirect to the contact detail page which now supports inline editing.
 * This prevents 404 when clicking "Edit" from the contact detail sidebar.
 */
export default async function ContactEditPage({ params }: ContactEditPageProps) {
  const { id } = await params
  redirect(`/contacts/${id}`)
}
