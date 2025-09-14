import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'

const CreateEvent: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!user) {
      navigate('/auth')
    }
  }, [user, navigate])

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
            <p>Event creation form coming soon! For now, you can organize events through our community channels.</p>
            <div style={{ marginTop: '2rem' }}>
              <button 
                className="btn secondary"
                onClick={() => navigate('/events')}
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
