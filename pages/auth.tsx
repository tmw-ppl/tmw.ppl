import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'

const Auth: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form states
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupPhone, setSignupPhone] = useState('')

  // Load remembered email on mount
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('tmw-ppl-remembered-email')
    if (rememberedEmail) {
      setLoginEmail(rememberedEmail)
      setRememberMe(true)
    }
  }, [])

  const { signIn, signUp } = useAuth()
  const router = useRouter()

  const showError = (message: string) => {
    setError(message)
    setSuccess(null)
    setTimeout(() => setError(null), 5000)
  }

  const showSuccess = (message: string) => {
    setSuccess(message)
    setError(null)
    setTimeout(() => setSuccess(null), 5000)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      showError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const { error } = await signIn(loginEmail, loginPassword)

      if (error) {
        showError(error.message)
      } else {
        // Save or clear remembered email based on checkbox
        if (rememberMe) {
          localStorage.setItem('tmw-ppl-remembered-email', loginEmail)
        } else {
          localStorage.removeItem('tmw-ppl-remembered-email')
        }
        console.log('Sign in successful, redirecting to profile...')
        setTimeout(() => {
          router.push('/profile')
        }, 500)
      }
    } catch (err) {
      showError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!signupEmail || !signupPassword || !signupName || !signupPhone) {
      showError('Please fill in all fields')
      return
    }

    if (signupPassword.length < 6) {
      showError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const { error } = await signUp(signupEmail, signupPassword, signupName, signupPhone)

      if (error) {
        showError(error.message)
      } else {
        showSuccess('Check your email for a confirmation link!')
      }
    } catch (err) {
      showError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-section">
      <div className="container">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Welcome back</h1>
            <p>Sign in to access exclusive events and connect with the community</p>
          </div>

          <div className="auth-tabs">
              <button
                className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Sign In
              </button>
              <button
                className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                onClick={() => setActiveTab('signup')}
              >
                Sign Up
              </button>
            </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label htmlFor="login-email">Email</label>
                <input
                  type="email"
                  id="login-email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  type="password"
                  id="login-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Your password"
                  required
                />
              </div>
              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <Link href="/forgot-password" className="forgot-password-link">
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="auth-form">
              <div className="form-group">
                <label htmlFor="signup-email">Email</label>
                <input
                  type="email"
                  id="signup-email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="signup-password">Password</label>
                <input
                  type="password"
                  id="signup-password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="signup-name">Full Name</label>
                <input
                  type="text"
                  id="signup-name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="signup-phone">Phone Number</label>
                <input
                  type="tel"
                  id="signup-phone"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          )}

          {error && <div className="error-message">{error}</div>}

          {success && <div className="error-message success">{success}</div>}

          <div className="auth-footer">
            <p>
              By signing up, you agree to our <a href="#">Terms of Service</a>{' '}
              and <a href="#">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Auth
