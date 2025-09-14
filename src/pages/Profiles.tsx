import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Chip from '../components/ui/Chip'

interface Profile {
  id: string
  name: string
  role: string
  bio: string
  skills: string[]
  stats: {
    projects: number
    events: number
    connections: number
  }
  avatar: string
  skillsData: string
  interestsData: string
}

const Profiles: React.FC = () => {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([])

  // Mock profile data from original HTML
  const mockProfiles: Profile[] = [
    {
      id: '1',
      name: 'Alex Chen',
      role: 'UI/UX Designer',
      bio: 'Passionate about creating intuitive digital experiences that bring people together. Love collaborating on community-driven projects.',
      skills: ['Figma', 'Adobe Creative Suite', 'Prototyping', 'User Research'],
      stats: { projects: 12, events: 8, connections: 156 },
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      skillsData: 'designer,ui,ux',
      interestsData: 'design,art,community'
    },
    {
      id: '2',
      name: 'Marcus Rodriguez',
      role: 'Full-Stack Developer',
      bio: 'Building the future one line of code at a time. Open source enthusiast and mentor for aspiring developers.',
      skills: ['React', 'Node.js', 'Python', 'AWS'],
      stats: { projects: 18, events: 15, connections: 203 },
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      skillsData: 'developer,frontend,react',
      interestsData: 'tech,open-source,mentoring'
    },
    {
      id: '3',
      name: 'Zoe Kim',
      role: 'Digital Artist',
      bio: 'Creating immersive digital experiences through art and animation. Always excited to collaborate on creative projects.',
      skills: ['Blender', 'After Effects', 'Procreate', 'Cinema 4D'],
      stats: { projects: 9, events: 6, connections: 89 },
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      skillsData: 'artist,digital-art,animation',
      interestsData: 'art,creativity,community'
    },
    {
      id: '4',
      name: 'David Park',
      role: 'Product Strategist',
      bio: 'Helping startups and innovators turn ideas into reality. Passionate about building products that make a difference.',
      skills: ['Product Strategy', 'Market Research', 'Business Development', 'Leadership'],
      stats: { projects: 7, events: 12, connections: 178 },
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      skillsData: 'entrepreneur,product,strategy',
      interestsData: 'innovation,startups,mentoring'
    },
    {
      id: '5',
      name: 'Sarah Johnson',
      role: 'Community Educator',
      bio: 'Building bridges between technology and community. Dedicated to making learning accessible and empowering for everyone.',
      skills: ['Teaching', 'Curriculum Design', 'Community Building', 'Public Speaking'],
      stats: { projects: 14, events: 22, connections: 312 },
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      skillsData: 'mentor,educator,community',
      interestsData: 'education,community-building,mentoring'
    },
    {
      id: '6',
      name: 'Jordan Lee',
      role: 'DevOps Engineer',
      bio: 'Scaling systems and building robust infrastructure. Love solving complex technical challenges and sharing knowledge.',
      skills: ['Docker', 'Kubernetes', 'Terraform', 'Python'],
      stats: { projects: 11, events: 9, connections: 134 },
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      skillsData: 'developer,backend,devops',
      interestsData: 'tech,infrastructure,open-source'
    },
    {
      id: '7',
      name: 'Maya Patel',
      role: 'Brand Designer',
      bio: 'Creating visual identities that tell compelling stories. Passionate about design that connects brands with their communities.',
      skills: ['Branding', 'Illustration', 'Typography', 'Print Design'],
      stats: { projects: 16, events: 7, connections: 167 },
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
      skillsData: 'designer,graphic-design,branding',
      interestsData: 'design,branding,creativity'
    },
    {
      id: '8',
      name: 'River Thompson',
      role: 'Visual Storyteller',
      bio: 'Capturing moments and telling stories through photography and visual media. Always exploring new ways to connect with audiences.',
      skills: ['Photography', 'Video Editing', 'Lightroom', 'Premiere Pro'],
      stats: { projects: 13, events: 11, connections: 145 },
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
      skillsData: 'artist,photography,visual-storytelling',
      interestsData: 'art,photography,storytelling'
    }
  ]

  const filters = [
    { key: 'all', label: 'All Members' },
    { key: 'designer', label: 'Designers' },
    { key: 'developer', label: 'Developers' },
    { key: 'artist', label: 'Artists' },
    { key: 'entrepreneur', label: 'Entrepreneurs' },
    { key: 'mentor', label: 'Mentors' }
  ]

  useEffect(() => {
    filterProfiles()
  }, [searchTerm, activeFilter])

  const filterProfiles = () => {
    let filtered = [...mockProfiles]

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(profile => {
        const searchableText = `${profile.name} ${profile.role} ${profile.bio} ${profile.skills.join(' ')}`.toLowerCase()
        return searchableText.includes(searchLower)
      })
    }

    // Apply category filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(profile => {
        const searchableData = `${profile.skillsData} ${profile.interestsData}`.toLowerCase()
        return searchableData.includes(activeFilter)
      })
    }

    setFilteredProfiles(filtered)
  }

  const handleConnect = (profileName: string) => {
    if (user) {
      alert(`Connection request sent to ${profileName}! 🤝`)
    } else {
      // In a real app, this would redirect to auth
      alert('Please sign in to connect with community members!')
    }
  }

  const handleViewProfile = (profileName: string) => {
    alert(`Viewing ${profileName}'s detailed profile - coming soon! 👤`)
  }

  const copySkill = async (skill: string) => {
    try {
      await navigator.clipboard.writeText(skill)
      alert('Skill copied to clipboard!')
    } catch (err) {
      console.log('Copy failed')
    }
  }

  return (
    <section className="hero">
      <div className="container">
        <h1>Community Profiles</h1>
        <p className="lead">Discover creative minds, connect with collaborators, and find your next project partner in the Tomorrow People community.</p>
        
        {/* Search and Filter Section */}
        <div className="search-section">
          <div className="search-bar">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, skills, or interests..." 
              className="search-input"
            />
            <button className="search-btn">🔍</button>
          </div>
          
          <div className="filters" aria-label="Profile Filters">
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
        </div>
        
        <div className="profiles" id="profiles-container">
          {filteredProfiles.map((profile) => (
            <div key={profile.id} className="profile-card" data-skills={profile.skillsData} data-interests={profile.interestsData}>
              <div className="profile-avatar">
                <img src={profile.avatar} alt={profile.name} />
              </div>
              <div className="profile-content">
                <div className="profile-header">
                  <h3 className="profile-name">{profile.name}</h3>
                  <span className="profile-role">{profile.role}</span>
                </div>
                
                <p className="profile-bio">{profile.bio}</p>
                
                <div className="profile-skills">
                  {profile.skills.map((skill, index) => (
                    <span 
                      key={index} 
                      className="skill-tag"
                      onClick={() => copySkill(skill)}
                      style={{ cursor: 'pointer' }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                
                <div className="profile-stats">
                  <div className="stat">
                    <span className="stat-number">{profile.stats.projects}</span>
                    <span className="stat-label">Projects</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">{profile.stats.events}</span>
                    <span className="stat-label">Events</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">{profile.stats.connections}</span>
                    <span className="stat-label">Connections</span>
                  </div>
                </div>
                
                <div className="profile-actions">
                  <Button onClick={() => handleConnect(profile.name)}>Connect</Button>
                  <Button variant="secondary" onClick={() => handleViewProfile(profile.name)}>View Profile</Button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredProfiles.length === 0 && (
            <div className="no-results">
              <h3>No profiles found</h3>
              <p>Try adjusting your search or filters to find community members.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Profiles
