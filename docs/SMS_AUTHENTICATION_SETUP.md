# SMS Authentication Setup Guide

This guide explains how to enable SMS (text message) authentication for Tomorrow People using Supabase and Twilio.

## Overview

SMS authentication allows users to sign up and sign in using their phone number instead of (or in addition to) email. This requires:

1. **Twilio Account** - A paid SMS service provider
2. **Supabase Configuration** - Enable SMS auth in your project
3. **Frontend Implementation** - Add SMS auth UI to your app

## Cost Considerations

### Twilio Pricing (as of 2024)

- **Pay-as-you-go:** ~$0.0075 per SMS (varies by country)
- **Phone number:** ~$1/month per number
- **Trial credits:** $15.50 free credits for new accounts

**Example costs:**
- 1,000 signups/month = ~$7.50/month
- 10,000 signups/month = ~$75/month

### Alternative: Supabase SMS (if available)

Supabase may offer SMS services in the future, but currently requires Twilio integration.

## Step 1: Set Up Twilio Account

1. **Create Twilio Account**
   - Go to [twilio.com](https://www.twilio.com)
   - Sign up for a free account (includes $15.50 trial credits)
   - Verify your phone number

2. **Get Twilio Credentials**
   - Go to **Console** → **Account** → **API Keys & Tokens**
   - Note your:
     - **Account SID**
     - **Auth Token**
     - **Phone Number** (buy one if needed)

3. **Configure Phone Number**
   - Purchase a phone number in **Phone Numbers** → **Buy a Number**
   - Choose a number that supports SMS
   - Note the phone number (e.g., +1234567890)

## Step 2: Configure Supabase

1. **Enable SMS Provider**
   - Go to Supabase Dashboard → **Authentication** → **Providers**
   - Find **Phone** provider
   - Enable it

2. **Add Twilio Credentials**
   - In the Phone provider settings, enter:
     - **Twilio Account SID**
     - **Twilio Auth Token**
     - **Twilio Phone Number** (your Twilio number)

3. **Configure SMS Template**
   - Go to **Authentication** → **SMS Templates**
   - Customize the OTP (One-Time Password) message:
   ```
   Your Tomorrow People verification code is: {{ .Code }}
   ```

## Step 3: Frontend Implementation

### Option A: Add SMS Tab to Auth Page

Update `pages/auth.tsx` to include SMS authentication:

```typescript
// Add SMS state
const [smsPhone, setSmsPhone] = useState('')
const [smsCode, setSmsCode] = useState('')
const [smsStep, setSmsStep] = useState<'phone' | 'code'>('phone')

// Add SMS sign in function
const handleSMSSignIn = async (e: React.FormEvent) => {
  e.preventDefault()
  
  if (smsStep === 'phone') {
    // Send OTP
    const { error } = await supabase.auth.signInWithOtp({
      phone: smsPhone,
    })
    
    if (!error) {
      setSmsStep('code')
    }
  } else {
    // Verify OTP
    const { error } = await supabase.auth.verifyOtp({
      phone: smsPhone,
      token: smsCode,
      type: 'sms',
    })
    
    if (!error) {
      router.push('/events')
    }
  }
}
```

### Option B: Create Separate SMS Auth Page

Create `pages/auth-sms.tsx`:

```typescript
import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'

const AuthSMS: React.FC = () => {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      phone: phone,
    })

    if (error) {
      setError(error.message)
    } else {
      setStep('code')
    }
    setLoading(false)
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: code,
      type: 'sms',
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/events')
    }
    setLoading(false)
  }

  return (
    <section className="auth-section">
      <div className="container">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Sign In with Phone</h1>
            <p>Enter your phone number to receive a verification code</p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="auth-form">
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Include country code (e.g., +1 for US)
                </small>
              </div>
              <Button type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="auth-form">
              <div className="form-group">
                <label htmlFor="code">Verification Code</label>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  required
                  maxLength={6}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Enter the 6-digit code sent to {phone}
                </small>
              </div>
              <Button type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => {
                  setStep('phone')
                  setCode('')
                }}
                style={{ marginTop: '0.5rem' }}
              >
                Change Phone Number
              </Button>
            </form>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="auth-footer">
            <p>
              <a href="/auth">Back to Email Sign In</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AuthSMS
```

## Step 4: Update AuthContext (Optional)

Add SMS auth methods to `src/contexts/AuthContext.tsx`:

```typescript
signInWithSMS: (phone: string) => Promise<{ data: any; error: any }>
verifySMS: (phone: string, token: string) => Promise<{ data: any; error: any }>
```

## Testing

1. **Test SMS Flow**
   - Enter your phone number
   - Receive OTP code via SMS
   - Enter code to verify
   - Should sign in successfully

2. **Test Edge Cases**
   - Invalid phone number format
   - Wrong OTP code
   - Expired OTP code
   - Rate limiting (too many requests)

## Security Considerations

1. **Rate Limiting**
   - Supabase has built-in rate limiting
   - Consider additional rate limiting in your app
   - Monitor for abuse

2. **Phone Number Validation**
   - Validate format before sending OTP
   - Use a library like `libphonenumber-js`

3. **OTP Expiration**
   - OTPs typically expire in 5-10 minutes
   - Configure in Supabase settings

## Cost Optimization Tips

1. **Use Email as Primary**
   - Keep SMS as optional/secondary auth method
   - Reduces SMS costs

2. **Implement Rate Limiting**
   - Prevent abuse/spam
   - Save on unnecessary SMS sends

3. **Monitor Usage**
   - Set up Twilio usage alerts
   - Track costs in Twilio dashboard

4. **Consider Alternatives**
   - WhatsApp Business API (if available)
   - Email OTP as fallback
   - Social auth (Google, GitHub, etc.)

## Troubleshooting

### SMS Not Received
- Check Twilio account balance
- Verify phone number format (include country code)
- Check Twilio logs for delivery status
- Verify Supabase SMS provider is enabled

### OTP Verification Fails
- Ensure code is entered within expiration time
- Check for typos in code
- Verify phone number matches exactly

### High Costs
- Review Twilio usage logs
- Implement stricter rate limiting
- Consider email-first approach

## Next Steps

1. Set up Twilio account and get credentials
2. Configure Supabase SMS provider
3. Implement SMS auth UI (choose Option A or B above)
4. Test thoroughly
5. Monitor costs and usage

## Resources

- [Twilio Documentation](https://www.twilio.com/docs)
- [Supabase Phone Auth Docs](https://supabase.com/docs/guides/auth/phone-login)
- [Twilio Pricing](https://www.twilio.com/pricing)
- [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js) - Phone number validation library

