import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

const AuthCallback: React.FC = () => {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Supabase automatically handles the OAuth callback
        // We just need to wait for the session to be established
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          router.push('/auth?error=oauth_failed')
          return
        }

        if (session) {
          // Successfully authenticated, redirect to events
          router.push('/events')
        } else {
          // No session yet, wait a bit for Supabase to process the callback
          setTimeout(() => {
            router.push('/auth?error=oauth_timeout')
          }, 2000)
        }
      } catch (err) {
        console.error('Error in auth callback:', err)
        router.push('/auth?error=oauth_error')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <section className="auth-section">
      <div className="container">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Completing sign in...</h1>
            <p>Please wait while we finish setting up your account</p>
          </div>
          <div className="loading-spinner" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid var(--border)', 
              borderTopColor: 'var(--primary)', 
              borderRadius: '50%', 
              margin: '0 auto',
              animation: 'spin 1s linear infinite'
            }} />
            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AuthCallback


