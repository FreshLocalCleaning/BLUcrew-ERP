import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BLU Crew Commercial ERP',
  description: 'Post-construction cleaning — commercial sales-to-handoff pipeline',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="h-full font-sans">{children}</body>
    </html>
  )
}
