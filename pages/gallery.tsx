import { useState } from 'react'
import Layout from '../src/components/Layout'
import Card from '../src/components/ui/Card'

interface ArtPiece {
  id: string
  title: string
  artist: string
  price: number
  image: string
  description: string
  medium: string
  dimensions: string
  year: number
  available: boolean
}

const mockArtPieces: ArtPiece[] = [
  {
    id: '1',
    title: 'Urban Reflections',
    artist: 'Maya Chen',
    price: 2500,
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=500&fit=crop',
    description: 'A vibrant exploration of city life through abstract forms and bold colors.',
    medium: 'Acrylic on Canvas',
    dimensions: '24" x 36"',
    year: 2024,
    available: true
  },
  {
    id: '2',
    title: 'Serenity in Blue',
    artist: 'James Rodriguez',
    price: 1800,
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop',
    description: 'Calming waves of blue create a meditative landscape that soothes the soul.',
    medium: 'Oil on Canvas',
    dimensions: '20" x 24"',
    year: 2023,
    available: true
  },
  {
    id: '3',
    title: 'Digital Dreams',
    artist: 'Alex Kim',
    price: 3200,
    image: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=400&h=500&fit=crop',
    description: 'A futuristic vision blending technology and humanity in perfect harmony.',
    medium: 'Mixed Media',
    dimensions: '30" x 40"',
    year: 2024,
    available: false
  },
  {
    id: '4',
    title: 'Nature\'s Symphony',
    artist: 'Sarah Williams',
    price: 2100,
    image: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=500&fit=crop',
    description: 'An organic composition celebrating the rhythms and patterns found in nature.',
    medium: 'Watercolor on Paper',
    dimensions: '18" x 24"',
    year: 2023,
    available: true
  },
  {
    id: '5',
    title: 'Midnight Jazz',
    artist: 'Marcus Thompson',
    price: 2800,
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop',
    description: 'The energy and improvisation of jazz music translated into visual form.',
    medium: 'Acrylic on Canvas',
    dimensions: '36" x 48"',
    year: 2024,
    available: true
  },
  {
    id: '6',
    title: 'Golden Hour',
    artist: 'Lisa Park',
    price: 1950,
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=500&fit=crop',
    description: 'Capturing the magical light of sunset through warm, glowing brushstrokes.',
    medium: 'Oil on Canvas',
    dimensions: '16" x 20"',
    year: 2023,
    available: true
  }
]

export default function Gallery() {
  const [selectedPiece, setSelectedPiece] = useState<ArtPiece | null>(null)
  const [filter, setFilter] = useState<'all' | 'available' | 'sold'>('all')

  const filteredPieces = mockArtPieces.filter(piece => {
    if (filter === 'available') return piece.available
    if (filter === 'sold') return !piece.available
    return true
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price)
  }

  return (
    <Layout>
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ 
              fontSize: '3rem', 
              fontWeight: 'bold', 
              color: 'white',
              marginBottom: '1rem',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              Tomorrow People Gallery
            </h1>
            <p style={{ 
              fontSize: '1.2rem', 
              color: 'rgba(255,255,255,0.9)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Discover extraordinary art from emerging and established artists. 
              Each piece tells a story of creativity, passion, and vision for tomorrow.
            </p>
          </div>

          {/* Filter Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '1rem', 
            marginBottom: '2rem' 
          }}>
            {[
              { key: 'all', label: 'All Artwork' },
              { key: 'available', label: 'Available' },
              { key: 'sold', label: 'Sold' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '25px',
                  border: 'none',
                  background: filter === key 
                    ? 'white' 
                    : 'rgba(255,255,255,0.2)',
                  color: filter === key ? '#667eea' : 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Art Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem',
            marginBottom: '3rem'
          }}>
            {filteredPieces.map(piece => (
              <Card 
                key={piece.id}
                style={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  background: 'white',
                  borderRadius: '15px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)'
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)'
                }}
                onClick={() => setSelectedPiece(piece)}
              >
                <div style={{ position: 'relative' }}>
                  <img 
                    src={piece.image} 
                    alt={piece.title}
                    style={{ 
                      width: '100%', 
                      height: '250px', 
                      objectFit: 'cover' 
                    }}
                  />
                  {!piece.available && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: '#ff4757',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      SOLD
                    </div>
                  )}
                </div>
                
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ 
                    fontSize: '1.3rem', 
                    fontWeight: 'bold', 
                    marginBottom: '0.5rem',
                    color: '#2c3e50'
                  }}>
                    {piece.title}
                  </h3>
                  
                  <p style={{ 
                    color: '#7f8c8d', 
                    marginBottom: '0.5rem',
                    fontSize: '1rem'
                  }}>
                    by {piece.artist}
                  </p>
                  
                  <p style={{ 
                    color: '#34495e', 
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                    lineHeight: '1.4'
                  }}>
                    {piece.description}
                  </p>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}>
                    <span style={{ 
                      fontSize: '1.4rem', 
                      fontWeight: 'bold', 
                      color: piece.available ? '#27ae60' : '#95a5a6'
                    }}>
                      {formatPrice(piece.price)}
                    </span>
                    
                    <span style={{ 
                      fontSize: '0.8rem', 
                      color: '#7f8c8d',
                      background: '#ecf0f1',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '15px'
                    }}>
                      {piece.medium}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Modal for Selected Piece */}
          {selectedPiece && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '2rem'
              }}
              onClick={() => setSelectedPiece(null)}
            >
              <div 
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  maxWidth: '800px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflow: 'auto',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '2rem'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <img 
                    src={selectedPiece.image} 
                    alt={selectedPiece.title}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      borderRadius: '20px 0 0 20px'
                    }}
                  />
                </div>
                
                <div style={{ padding: '2rem' }}>
                  <h2 style={{ 
                    fontSize: '2rem', 
                    fontWeight: 'bold', 
                    marginBottom: '0.5rem',
                    color: '#2c3e50'
                  }}>
                    {selectedPiece.title}
                  </h2>
                  
                  <p style={{ 
                    fontSize: '1.2rem',
                    color: '#7f8c8d', 
                    marginBottom: '1rem'
                  }}>
                    by {selectedPiece.artist} ({selectedPiece.year})
                  </p>
                  
                  <p style={{ 
                    color: '#34495e', 
                    marginBottom: '1.5rem',
                    lineHeight: '1.6'
                  }}>
                    {selectedPiece.description}
                  </p>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Medium:</strong> {selectedPiece.medium}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Dimensions:</strong> {selectedPiece.dimensions}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Year:</strong> {selectedPiece.year}
                    </div>
                  </div>
                  
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: 'bold', 
                    color: selectedPiece.available ? '#27ae60' : '#95a5a6',
                    marginBottom: '1.5rem'
                  }}>
                    {formatPrice(selectedPiece.price)}
                    {!selectedPiece.available && (
                      <span style={{ 
                        fontSize: '1rem', 
                        color: '#e74c3c',
                        marginLeft: '1rem'
                      }}>
                        SOLD
                      </span>
                    )}
                  </div>
                  
                  {selectedPiece.available && (
                    <button style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginBottom: '1rem'
                    }}>
                      Inquire About Purchase
                    </button>
                  )}
                  
                  <button 
                    onClick={() => setSelectedPiece(null)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#ecf0f1',
                      color: '#2c3e50',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
