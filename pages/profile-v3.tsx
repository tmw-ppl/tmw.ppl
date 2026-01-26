import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'

// Redirect /profile-v3 to /profile-v2 (sections view has been consolidated into v2)
const ProfileV3: React.FC = () => {
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

export default ProfileV3
