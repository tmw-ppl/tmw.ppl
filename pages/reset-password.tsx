import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { updatePassword, session } = useAuth()
  const router = useRouter()

  // Check if user has a valid session (came from email link)
  useEffect(() => {
    // Give Supabase a moment to process the URL tokens
    const timer = setTimeout(() => {
      if (!session) {
        // No session means the reset link is invalid or expired
        setError('Invalid or expired reset link. Please request a new one.')
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [session])

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
                placeholder="Enter new password"
                required
                minLength={6}
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
              disabled={loading || !session}
            >
              {loading ? 'Updating...' : 'Update Password'}
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
