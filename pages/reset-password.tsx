import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  const { updatePassword, session } = useAuth()
  const router = useRouter()

  // Listen for PASSWORD_RECOVERY event from Supabase and handle URL hash fragments
  useEffect(() => {
    // Check for password recovery tokens in URL hash (Supabase sends tokens in hash fragment)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')
    
    // If we have a recovery token in the URL, process it
    if (accessToken && type === 'recovery') {
      // Supabase will automatically process the hash fragment and trigger PASSWORD_RECOVERY event
      // We just need to wait for it
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          // User clicked password recovery link from email
          setIsRecoveryMode(true)
          setCheckingSession(false)
          setError(null)
        } else if (event === 'SIGNED_IN' && session) {
          // User is signed in (could be from recovery link being processed)
          setIsRecoveryMode(true)
          setCheckingSession(false)
          setError(null)
        }
      }
    )

    // Also check current session state
    const checkCurrentSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession) {
          setIsRecoveryMode(true)
          setCheckingSession(false)
        } else {
          // Give more time for URL hash to be processed by Supabase
          // Supabase processes hash fragments automatically, but it may take a moment
          setTimeout(() => {
            // Check again after delay
            supabase.auth.getSession().then(({ data: { session: delayedSession } }) => {
              if (delayedSession) {
                setIsRecoveryMode(true)
              }
              setCheckingSession(false)
            }).catch(() => {
              setCheckingSession(false)
            })
          }, 2000)
        }
      } catch (err) {
        setCheckingSession(false)
      }
    }

    checkCurrentSession()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Show error if no session after checking
  useEffect(() => {
    if (!checkingSession && !isRecoveryMode && !session) {
      setError('Invalid or expired reset link. Please request a new one.')
    }
  }, [checkingSession, isRecoveryMode, session])

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword || !confirmPassword) {
      showError('Please fill in all fields')
      return
    }

    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      showError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error } = await updatePassword(newPassword)

      if (error) {
        showError(error.message)
      } else {
        setSuccess(true)
        // Redirect to profile after a short delay
        setTimeout(() => {
          router.push('/profile')
        }, 2000)
      }
    } catch (err) {
      showError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking session
  if (checkingSession) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-container">
            <div className="auth-header">
              <h1>Verifying Link...</h1>
              <p>Please wait while we verify your reset link</p>
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

  if (success) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-container">
            <div className="auth-header">
              <h1>Password Updated!</h1>
              <p>Your password has been successfully reset. Redirecting you now...</p>
            </div>
            <div className="success-icon">✓</div>
          </div>
        </div>
      </section>
    )
  }

  // Show error state if link is invalid
  if (!isRecoveryMode && !session) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-container">
            <div className="auth-header">
              <h1>Link Expired</h1>
              <p>This password reset link is invalid or has expired.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            </div>
            <Button
              variant="primary"
              fullWidth
              onClick={() => router.push('/forgot-password')}
            >
              Request New Reset Link
            </Button>
            <div className="auth-footer">
              <p>
                <a href="/auth">Back to Sign In</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="auth-section">
      <div className="container">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Set New Password</h1>
            <p>Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                required
                minLength={6}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>

          {error && <div className="error-message">{error}</div>}

          <div className="auth-footer">
            <p>
              <a href="/auth">Back to Sign In</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ResetPassword
