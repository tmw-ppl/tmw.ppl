import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

const Confirm: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [status, setStatus] = useState('Processing confirmation...')
  const [, setLoading] = useState(true)

  useEffect(() => {
    handleEmailConfirmation()
  }, [])

  const handleEmailConfirmation = async () => {
    try {
      console.log('Handling email confirmation...')

      // Check if user is already signed in
      if (user) {
        console.log('User already signed in:', user.email)
        setStatus("✅ Email confirmed! You're signed in.")
        setLoading(false)
        return
      }

      // Try to get the session from URL parameters
      const accessToken = router.query.access_token as string
      const refreshToken = router.query.refresh_token as string
      const type = router.query.type as string

      console.log('URL params:', {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken,
        type,
      })

      if (accessToken && refreshToken) {
        console.log('Setting session with tokens...')

        // Set the session manually
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          console.error('Session error:', error)
          throw error
        }

        console.log('Session set successfully:', data)

        // Wait a moment for auth context to update
        setTimeout(() => {
          setStatus("✅ Email confirmed! You're now signed in.")
          setLoading(false)
        }, 1000)
      } else {
        console.log('No tokens found in URL')
        setStatus('Email confirmed! Please sign in to continue.')
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Confirmation error:', error)
      setStatus(`Error: ${error.message}. Please try signing in manually.`)
      setLoading(false)
    }
  }

  return (
    <section className="auth-section">
      <div className="container">
        <div className="auth-container">
          <div className="auth-header">
            <h1>🎉 Welcome to Tomorrow People!</h1>
            <p>
              Your email has been confirmed. You're now part of the community!
            </p>
          </div>

          <Card>
            <div style={{ textAlign: 'center', margin: '32px 0' }}>
              <p>{status}</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              {user ? (
                <Button
                  variant="primary"
                  onClick={() => router.push('/profile')}
                >
                  Go to Your Profile
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => router.push('/auth')}
                >
                  Sign In
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default Confirm
