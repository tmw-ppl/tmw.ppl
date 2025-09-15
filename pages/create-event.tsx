import React from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import Card from '@/components/ui/Card'

const CreateEvent: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!user) {
      router.push('/auth')
    }
  }, [user, router])

  if (!user) {
    return null
  }

  return (
    <section className="auth-section">
      <div className="container">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Create Event</h1>
            <p>Organize your own Tomorrow People gathering</p>
          </div>

          <Card>
            <p>
              Event creation form coming soon! For now, you can organize events
              through our community channels.
            </p>
            <div style={{ marginTop: '2rem' }}>
              <button
                className="btn secondary"
                onClick={() => router.push('/events')}
              >
                Back to Events
              </button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default CreateEvent
