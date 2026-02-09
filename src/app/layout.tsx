import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Budget Tool — Oskar',
  description: 'Persönliches Budget & Finanzen Tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="dark" suppressHydrationWarning>
      <body className="bg-dark-950 text-dark-50 min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
