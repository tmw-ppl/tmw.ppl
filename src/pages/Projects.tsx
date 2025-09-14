import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Chip from '../components/ui/Chip'

interface Project {
  id: string
  title: string
  description: string
  category: string
  image: string
  currentAmount: number
  goalAmount: number
  contributors: number
  daysLeft: number | string
  isFunded: boolean
  status?: string
}

const Projects: React.FC = () => {
  const { user } = useAuth()
  const [activeFilter, setActiveFilter] = useState('all')
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])

  // Mock project data from original HTML
  const mockProjects: Project[] = [
    {
      id: '1',
      title: 'AI Art Generator Studio',
      description: 'An open-source AI art generator that creates unique digital artworks using community-contributed prompts and styles.',
      category: 'tech',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
      currentAmount: 7500,
      goalAmount: 10000,
      contributors: 42,
      daysLeft: 12,
      isFunded: false
    },
    {
      id: '2',
      title: 'Interactive Light Installation',
      description: 'A large-scale interactive light installation that responds to movement and sound, creating immersive experiences for community events.',
      category: 'art',
      image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop',
      currentAmount: 2250,
      goalAmount: 5000,
      contributors: 18,
      daysLeft: 8,
      isFunded: false
    },
    {
      id: '3',
      title: 'Community Garden Initiative',
      description: 'Transform unused urban space into a thriving community garden with educational programs and sustainable farming practices.',
      category: 'community',
      image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&h=300&fit=crop',
      currentAmount: 4500,
      goalAmount: 5000,
      contributors: 67,
      daysLeft: 3,
      isFunded: false
    },
    {
      id: '4',
      title: 'VR Learning Platform',
      description: 'An immersive VR platform for collaborative learning and creative workshops, bringing remote education to the next level.',
      category: 'tech',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
      currentAmount: 1500,
      goalAmount: 5000,
      contributors: 12,
      daysLeft: 25,
      isFunded: false
    },
    {
      id: '5',
      title: 'Digital Art Gallery',
      description: 'A virtual gallery showcasing digital art from Tomorrow People community members with interactive exhibitions.',
      category: 'art',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      currentAmount: 3200,
      goalAmount: 3000,
      contributors: 28,
      daysLeft: 'Completed',
      isFunded: true,
      status: '✅ Funded'
    },
    {
      id: '6',
      title: 'Creative Workshop Series',
      description: 'Monthly workshops covering everything from coding to ceramics, bringing together community members to learn and create together.',
      category: 'community',
      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop',
      currentAmount: 1800,
      goalAmount: 3000,
      contributors: 35,
      daysLeft: 15,
      isFunded: false
    }
  ]

  const filters = [
    { key: 'all', label: 'All Projects' },
    { key: 'tech', label: 'Tech' },
    { key: 'art', label: 'Art' },
    { key: 'community', label: 'Community' },
    { key: 'funded', label: 'Funded' },
    { key: 'active', label: 'Active' }
  ]

  useEffect(() => {
    filterProjects()
  }, [activeFilter])

  const filterProjects = () => {
    let filtered = [...mockProjects]

    if (activeFilter === 'all') {
      // Show all projects
    } else if (activeFilter === 'funded') {
      filtered = filtered.filter(project => project.isFunded)
    } else if (activeFilter === 'active') {
      filtered = filtered.filter(project => !project.isFunded)
    } else {
      filtered = filtered.filter(project => project.category === activeFilter)
    }

    setFilteredProjects(filtered)
  }

  const handleSupport = () => {
    if (user) {
      alert('Payment integration coming soon! 🚀')
    } else {
      alert('Please sign in to support projects!')
    }
  }

  const handleViewDetails = () => {
    alert('Project detail page coming soon! 📋')
  }

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100)
  }

  return (
    <section className="hero">
      <div className="container">
        <h1>Community Projects</h1>
        <p className="lead">Support innovative projects by Tomorrow People community members. From art installations to tech experiments, help bring creative ideas to life.</p>
        
        <div className="filters" aria-label="Project Filters">
          {filters.map(filter => (
            <Chip
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={activeFilter === filter.key ? 'active' : 'inactive'}
            >
              {filter.label}
            </Chip>
          ))}
        </div>
        
        <div className="projects" id="projects-container">
          {filteredProjects.map((project) => (
            <div key={project.id} className={`project ${project.isFunded ? 'funded' : ''}`} data-category={project.category}>
              <div className="project-image">
                <img src={project.image} alt={project.title} />
              </div>
              <div className="project-content">
                <div className="project-header">
                  <h3 className="project-title">{project.title}</h3>
                  <span className="project-category">{project.category.charAt(0).toUpperCase() + project.category.slice(1)}</span>
                  {project.status && <span className="project-status funded">{project.status}</span>}
                </div>
                
                <p className="project-description">{project.description}</p>
                
                <div className="project-stats">
                  <div className="funding-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${getProgressPercentage(project.currentAmount, project.goalAmount)}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      <span className="current-amount">${project.currentAmount.toLocaleString()}</span>
                      <span className="goal-amount">of ${project.goalAmount.toLocaleString()}</span>
                      <span className="percentage">{Math.round(getProgressPercentage(project.currentAmount, project.goalAmount))}%</span>
                    </div>
                  </div>
                  
                  <div className="project-meta">
                    <div className="contributors">👥 {project.contributors} contributors</div>
                    <div className="days-left">
                      {project.isFunded ? '✅ Completed' : `⏰ ${project.daysLeft} days left`}
                    </div>
                  </div>
                </div>
                
                <div className="project-actions">
                  {project.isFunded ? (
                    <Button onClick={handleViewDetails}>View Results</Button>
                  ) : (
                    <Button onClick={handleSupport}>Support Project</Button>
                  )}
                  <Button variant="secondary" onClick={handleViewDetails}>View Details</Button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredProjects.length === 0 && (
            <div className="no-results">
              <h3>No projects found</h3>
              <p>Try adjusting your filters to find community projects.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Projects
