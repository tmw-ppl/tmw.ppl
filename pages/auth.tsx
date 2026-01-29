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

  const { signIn, signUp, signInWithGoogle, signInWithFacebook } = useAuth()
  const router = useRouter()

  // Check for OAuth errors in URL
  React.useEffect(() => {
    const { error } = router.query
    if (error) {
      if (error === 'oauth_failed' || error === 'oauth_timeout' || error === 'oauth_error') {
        showError('OAuth sign-in failed. Please try again.')
      }
      // Clean up URL
      router.replace('/auth', undefined, { shallow: true })
    }
  }, [router.query])

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
        console.log('Sign in successful, redirecting to events...')
        setTimeout(() => {
          router.push('/events')
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

            {/* OAuth Buttons */}
            <div className="oauth-buttons" style={{ marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true)
                  const { error } = await signInWithGoogle()
                  if (error) {
                    showError(error.message || 'Failed to sign in with Google')
                    setLoading(false)
                  }
                  // If successful, user will be redirected to OAuth provider
                }}
                disabled={loading}
                className="oauth-button oauth-google"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.75rem',
                  background: 'white',
                  color: '#333',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#f5f5f5'
                    e.currentTarget.style.borderColor = 'var(--primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'white'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.951H.957C.348 6.174 0 7.55 0 9s.348 2.826.957 4.049l3.007-2.342z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.951L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true)
                  const { error } = await signInWithFacebook()
                  if (error) {
                    showError(error.message || 'Failed to sign in with Facebook')
                    setLoading(false)
                  }
                  // If successful, user will be redirected to OAuth provider
                }}
                disabled={loading}
                className="oauth-button oauth-facebook"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: '#1877F2',
                  color: 'white',
                  border: '1px solid #1877F2',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#166FE5'
                    e.currentTarget.style.borderColor = '#166FE5'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#1877F2'
                    e.currentTarget.style.borderColor = '#1877F2'
                  }
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M18 9c0-4.97-4.03-9-9-9S0 4.03 0 9c0 4.42 3.21 8.08 7.41 8.84v-6.26H5.31V9h2.1V7.01c0-2.08 1.24-3.23 3.13-3.23.91 0 1.86.16 1.86.16v2.05h-1.05c-1.03 0-1.35.64-1.35 1.3V9h2.31l-.37 2.58h-1.94v6.26C14.79 17.08 18 13.42 18 9z" fill="white"/>
                </svg>
                Continue with Facebook
              </button>
            </div>

            {/* Divider */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '1.5rem',
              color: 'var(--muted)',
              fontSize: '0.875rem'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ padding: '0 1rem' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
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
