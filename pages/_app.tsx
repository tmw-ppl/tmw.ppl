import type { AppProps } from 'next/app'
import { AuthProvider } from '@/contexts/AuthContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import { Analytics } from '@vercel/analytics/react'
import '@/index.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <Analytics />
      </AuthProvider>
    </ErrorBoundary>
  )
}
