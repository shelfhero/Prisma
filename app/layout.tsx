import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import ErrorBoundary from '@/components/error/ErrorBoundary'
import Navigation from '@/components/layout/Navigation'
import Footer from '@/components/layout/Footer'
import OfflineIndicator from '@/components/offline/OfflineIndicator'
import FeedbackForm from '@/components/help/FeedbackForm'
import BugReporter from '@/components/help/BugReporter'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Призма - Касови бележки и бюджетиране',
  description: 'Българско приложение за сканиране на касови бележки и проследяване на разходи',
  keywords: ['касови бележки', 'бюджет', 'разходи', 'България', 'OCR'],
  authors: [{ name: 'shelfhero' }],
  creator: 'shelfhero',
  publisher: 'shelfhero',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
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
    <html lang="bg" className="overflow-x-hidden">
      <head>
        {/* Preconnect to Supabase API for faster auth requests */}
        <link rel="preconnect" href="https://eisfwocfkejsxipmbyzp.supabase.co" />
        <link rel="dns-prefetch" href="https://eisfwocfkejsxipmbyzp.supabase.co" />
      </head>
      <body className={`${inter.className} overflow-x-hidden`}>
        <ErrorBoundary>
          <AuthProvider>
            <OfflineIndicator />
            <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
              <Navigation />
              <main className="flex-1 overflow-x-hidden">
                {children}
              </main>
              <Footer />
            </div>
            <Toaster position="top-right" richColors />
            <FeedbackForm />
            <BugReporter />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}