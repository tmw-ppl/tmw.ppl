import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Link from 'next/link'

const Confirm: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Processing email confirmation...')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    handleEmailConfirmation()
  }, [])

  const handleEmailConfirmation = async () => {
    try {
      // Check if user is already signed in
      if (user) {
        setStatus('success')
        setMessage("✅ Your email has been confirmed! You're all set.")
        setLoading(false)
        return
      }

      // Try to get the session from URL hash (Supabase uses hash fragments)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token') || (router.query.access_token as string)
      const refreshToken = hashParams.get('refresh_token') || (router.query.refresh_token as string)
      const type = hashParams.get('type') || (router.query.type as string)

      if (accessToken && refreshToken) {
        // Set the session manually
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          throw error
        }

        // Wait a moment for auth context to update
        setTimeout(() => {
          setStatus('success')
          setMessage("✅ Your email has been confirmed! You're now signed in.")
          setLoading(false)
        }, 1000)
      } else {
        // No tokens - email was confirmed but user needs to sign in
        setStatus('success')
        setMessage('✅ Your email has been confirmed! Please sign in to continue.')
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Confirmation error:', error)
      setStatus('error')
      setMessage('There was an error confirming your email. Please try signing in manually.')
      setLoading(false)
    }
  }

  return (
    <section className="auth-section">
      <div className="container">
        <div className="auth-container">
          <div className="auth-header">
            {status === 'processing' && (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                <h1>Confirming Your Email</h1>
                <p>Please wait while we verify your email address...</p>
              </>
            )}
            {status === 'success' && (
              <>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                <h1>Email Confirmed!</h1>
                <p>{message}</p>
              </>
            )}
            {status === 'error' && (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                <h1>Confirmation Error</h1>
                <p>{message}</p>
              </>
            )}
          </div>

          {status === 'processing' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
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
          )}

          {status === 'success' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{
                background: 'var(--bg-2)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.9375rem', lineHeight: '1.6' }}>
                  {user 
                    ? "You're all set! You can now access all features of Tomorrow People."
                    : "Your account has been verified. Please sign in below to get started."
                  }
                </p>
              </div>
              
              {user ? (
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => router.push('/events')}
                >
                  Go to Events
                </Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => router.push('/auth')}
                  >
                    Sign In Now
                  </Button>
                  <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Welcome to Tomorrow People! 🚀
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <Button
                variant="primary"
                fullWidth
                onClick={() => router.push('/auth')}
              >
                Go to Sign In
              </Button>
              <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
                <p>
                  <Link href="/auth">Back to Sign In</Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Confirm
