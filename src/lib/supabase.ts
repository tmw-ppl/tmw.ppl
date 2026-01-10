import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://eloardiuuuuuuvecrooo.supabase.co'
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsb2FyZGl1dXV1dXV2ZWNyb29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMDAxNTQsImV4cCI6MjA3MjY3NjE1NH0.1VdDRP3df1v5gJWp56P1_KwX87LceDp6JMaIyogkOHU'

// Create a singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return supabaseInstance
})()

// Types for authentication
export interface AuthUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
  }
  created_at?: string
}

export interface AuthSession {
  user: AuthUser
  access_token: string
  refresh_token: string
}

// Database types
export interface Profile {
  id: string
  full_name: string
  email: string
  created_at?: string
  updated_at?: string
}

export interface Event {
  id: string
  title: string
  description?: string
  date: string
  time?: string
  end_time?: string
  location?: string
  rsvp_url?: string
  image_url?: string
  tags?: string[]
  published: boolean
  created_by: string
  created_at: string
  updated_at: string
  // Creator information from join
  creator?: {
    full_name: string
    email: string
  }
}

// Channel Types
export interface ChannelCategory {
  id: string
  name: string
  description?: string
  icon?: string
  display_order: number
  created_at: string
}

export interface Channel {
  id: string
  name: string
  description?: string
  category_id?: string
  type: 'public' | 'private' | 'event' | 'project'
  is_archived: boolean
  is_read_only: boolean
  event_id?: string
  project_id?: string
  created_by: string
  created_at: string
  updated_at: string
  last_message_at?: string
  // Joined data
  category?: ChannelCategory
  creator?: Profile
  unread_count?: number
  member_count?: number
}

export interface ChannelMember {
  id: string
  channel_id: string
  user_id: string
  role: 'owner' | 'admin' | 'moderator' | 'member'
  is_muted: boolean
  is_banned: boolean
  muted_until?: string
  notifications_enabled: boolean
  joined_at: string
  last_read_at: string
  // Joined data
  profile?: Profile
}

export interface ChannelMessage {
  id: string
  channel_id: string
  user_id: string
  content: string
  message_type: 'text' | 'image' | 'video' | 'file' | 'system'
  attachments?: Array<{
    type: string
    url: string
    filename?: string
    size?: number
    thumbnail?: string
  }>
  parent_message_id?: string
  thread_count?: number
  mentioned_user_ids?: string[]
  edited_at?: string
  deleted_at?: string
  deleted_by?: string
  created_at: string
  updated_at: string
  // Joined data
  profile?: Profile
  reactions?: MessageReaction[]
  read_receipts?: MessageReadReceipt[]
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  profile?: Profile
}

export interface MessageReadReceipt {
  id: string
  message_id: string
  user_id: string
  read_at: string
  profile?: Profile
}
