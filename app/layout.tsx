import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import Navigation from '@/components/layout/Navigation'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Призма - Касови бележки и бюджетиране',
  description: 'Българско приложение за сканиране на касови бележки и проследяване на разходи',
  keywords: ['касови бележки', 'бюджет', 'разходи', 'България', 'OCR'],
  authors: [{ name: 'shelfhero' }],
  creator: 'shelfhero',
  publisher: 'shelfhero',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bg">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
          </div>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  )
}