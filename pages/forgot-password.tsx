import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { resetPassword } = useAuth()

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      showError('Please enter your email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      showError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const { error } = await resetPassword(email)

      if (error) {
        showError(error.message)
      } else {
        setSuccess(true)
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
              <div className="success-icon">✉️</div>
              <h1>Check Your Email</h1>
              <p>
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>
            
            <div className="reset-instructions">
              <p>Click the link in the email to reset your password. The link will expire in 24 hours.</p>
              <p className="muted-text">
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                >
                  try again
                </button>
              </p>
            </div>

            <div className="auth-footer">
              <p>
                <Link href="/auth">Back to Sign In</Link>
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          .success-icon {
            font-size: 4rem;
            text-align: center;
            margin-bottom: 1rem;
          }
          .reset-instructions {
            text-align: center;
            padding: 1.5rem;
            background: var(--bg-2);
            border-radius: 12px;
            margin: 1.5rem 0;
          }
          .reset-instructions p {
            margin: 0 0 1rem 0;
            color: var(--muted);
            font-size: 0.9375rem;
            line-height: 1.6;
          }
          .reset-instructions p:last-child {
            margin-bottom: 0;
          }
          .muted-text {
            font-size: 0.875rem !important;
          }
          .text-link {
            background: none;
            border: none;
            color: var(--primary);
            cursor: pointer;
            font-size: inherit;
            padding: 0;
            text-decoration: underline;
          }
          .text-link:hover {
            color: var(--accent);
          }
        `}</style>
      </section>
    )
  }

  return (
    <section className="auth-section">
      <div className="container">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Reset Password</h1>
            <p>Enter your email address and we'll send you a link to reset your password</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
            </Button>
          </form>

          {error && <div className="error-message">{error}</div>}

          <div className="auth-footer">
            <p>
              Remember your password? <Link href="/auth">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ForgotPassword
