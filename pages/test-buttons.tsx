import React from 'react'
import Layout from '../src/components/Layout'
import Button from '../src/components/ui/Button'
import Card from '../src/components/ui/Card'
import Chip from '../src/components/ui/Chip'

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

        <section style={{ marginTop: '3rem' }}>
          <h2>Comparison Notes</h2>
          <p>All components above should look identical to their CSS counterparts. Check for:</p>
          <ul>
            <li>✅ <strong>Buttons:</strong> Same colors, gradients, padding, border radius, hover effects</li>
            <li>✅ <strong>Cards:</strong> Same background, border, shadow, padding, border radius</li>
            <li>✅ <strong>Chips:</strong> Same colors, opacity, border radius, active/inactive states</li>
          </ul>
        </section>
      </div>
    </Layout>
  )
}
