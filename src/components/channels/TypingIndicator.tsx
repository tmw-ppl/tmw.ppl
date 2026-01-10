import React, { useState, useEffect } from 'react'
import { supabase, type Profile } from '@/lib/supabase'

interface TypingIndicatorProps {
  channelId: string
  currentUserId: string
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  channelId,
  currentUserId
}) => {
  const [typingUsers, setTypingUsers] = useState<Array<{ user_id: string; profile?: Profile }>>([])

  useEffect(() => {
    // Subscribe to typing indicators
    const channel = supabase
      .channel(`typing:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_typing_indicators',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          // Load current typing users
          const { data } = await supabase
            .from('channel_typing_indicators')
            .select(`
              user_id,
              profile:profiles!user_id(full_name, email)
            `)
            .eq('channel_id', channelId)
            .neq('user_id', currentUserId)
            .gt('expires_at', new Date().toISOString())

          if (data) {
            setTypingUsers(data as any)
          }
        }
      )
      .subscribe()

    // Poll for typing indicators (cleanup expired ones)
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('channel_typing_indicators')
        .select(`
          user_id,
          profile:profiles!user_id(full_name, email)
        `)
        .eq('channel_id', channelId)
        .neq('user_id', currentUserId)
        .gt('expires_at', new Date().toISOString())

      if (data) {
        setTypingUsers(data as any)
      } else {
        setTypingUsers([])
      }
    }, 2000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [channelId, currentUserId])

  if (typingUsers.length === 0) return null

  const names = typingUsers
    .map(t => t.profile?.full_name || 'Someone')
    .slice(0, 3)

  let text = ''
  if (names.length === 1) {
    text = `${names[0]} is typing...`
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing...`
  } else {
    text = `${names[0]}, ${names[1]}, and ${typingUsers.length - 2} other${typingUsers.length - 2 === 1 ? '' : 's'} are typing...`
  }

  return (
    <div style={{
      padding: '0.5rem 1rem',
      fontSize: '0.85rem',
      color: 'var(--muted)',
      fontStyle: 'italic',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }}>
      <div style={{
        display: 'flex',
        gap: '2px'
      }}>
        <span style={{ animation: 'bounce 1.4s infinite', animationDelay: '0s' }}>•</span>
        <span style={{ animation: 'bounce 1.4s infinite', animationDelay: '0.2s' }}>•</span>
        <span style={{ animation: 'bounce 1.4s infinite', animationDelay: '0.4s' }}>•</span>
      </div>
      {text}
      <style jsx>{`
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default TypingIndicator
