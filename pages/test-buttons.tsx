import React from 'react'
import Layout from '../src/components/Layout'
import Button from '../src/components/ui/Button'
import Card from '../src/components/ui/Card'
import Chip from '../src/components/ui/Chip'
import Icon from '../src/components/ui/Icon'
import Avatar from '../src/components/ui/Avatar'
import Loading from '../src/components/ui/Loading'

export default function TestButtons() {
  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Component Migration Test</h1>
        
        <section style={{ marginBottom: '3rem' }}>
          <h2>Original CSS Buttons</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button className="btn">Default</button>
            <button className="btn primary">Primary</button>
            <button className="btn secondary">Secondary</button>
            <button className="btn danger">Danger</button>
            <button className="btn warning">Warning</button>
            <button className="btn success">Success</button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button className="btn small">Small</button>
            <button className="btn">Medium</button>
            <button className="btn inline">Inline</button>
          </div>
          <div>
            <button className="btn full-width">Full Width</button>
          </div>
        </section>

        <section>
          <h2>New Tailwind Button Component</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Button>Default</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="success">Success</Button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Button size="small">Small</Button>
            <Button>Medium</Button>
            <Button size="inline">Inline</Button>
          </div>
          <div>
            <Button fullWidth>Full Width</Button>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2>Original CSS Cards</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div className="card">
              <h3>Original Card</h3>
              <p>This uses the original .card CSS class</p>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2>New Card Component</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Card>
              <h3>New Card</h3>
              <p>This uses the new Card component with inline styles</p>
            </Card>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2>Original CSS Chips</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <span className="chip inactive">Inactive Chip</span>
            <span className="chip active">Active Chip</span>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2>New Chip Component</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Chip active={false}>Inactive Chip</Chip>
            <Chip active={true}>Active Chip</Chip>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2>Original CSS Icons</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div className="icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
              </svg>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2>New Icon Component</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Icon aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
              </svg>
            </Icon>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2>Original CSS Avatars</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div className="avatar-placeholder">
              <span>SP</span>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2>New Avatar Component</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Avatar name="Sergey Piterman" />
            <Avatar name="John Doe" size={60} />
            <Avatar src="/assets/logo-original.png" alt="Logo" name="Logo" size={50} />
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2>Original CSS Loading</h2>
          <div className="loading-message">Loading content...</div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2>New Loading Component</h2>
          <Loading message="Loading new content..." />
        </section>

        <section style={{ marginTop: '3rem' }}>
          <h2>Comparison Notes</h2>
          <p>All components above should look identical to their CSS counterparts. Check for:</p>
          <ul>
            <li>✅ <strong>Buttons:</strong> Same colors, gradients, padding, border radius, hover effects</li>
            <li>✅ <strong>Cards:</strong> Same background, border, shadow, padding, border radius</li>
            <li>✅ <strong>Chips:</strong> Same colors, opacity, border radius, active/inactive states</li>
            <li>✅ <strong>Icons:</strong> Same gradient background, border, size, grid centering</li>
            <li>✅ <strong>Avatars:</strong> Same gradient, border radius, initials, sizing</li>
            <li>✅ <strong>Loading:</strong> Same text alignment, padding, muted color</li>
          </ul>
        </section>
      </div>
    </Layout>
  )
}
