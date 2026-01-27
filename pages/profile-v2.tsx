import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'

// Redirect /profile-v2 to /profile (backwards compatibility)
const ProfileV2: React.FC = () => {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      router.push('/auth')
      return
    }

    // Redirect to profile, preserving the id query parameter
    const query = router.query.id ? { id: router.query.id } : {}
    router.push({
      pathname: '/profile',
      query
    })
  }, [router, user, authLoading])

  return null
}

export default ProfileV2
