import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment variables
// For local dev: Set in .env.local (from `supabase start` output)
// For staging/prod: Set in deployment environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Fallback values for development (remove these once .env.local is set up)
const FALLBACK_URL = 'https://eloardiuuuuuuvecrooo.supabase.co'
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsb2FyZGl1dXV1dXV2ZWNyb29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMDAxNTQsImV4cCI6MjA3MjY3NjE1NH0.1VdDRP3df1v5gJWp56P1_KwX87LceDp6JMaIyogkOHU'

// Use environment variables if available, otherwise fall back to defaults (development only)
const finalUrl = supabaseUrl || FALLBACK_URL
const finalKey = supabaseKey || FALLBACK_KEY

// Warn if using fallback values (development only)
if ((!supabaseUrl || !supabaseKey) && process.env.NODE_ENV !== 'production') {
  console.warn(
    '⚠️  Using fallback Supabase credentials. For local development, create .env.local with:\n' +
    `  NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321\n` +
    `  NEXT_PUBLIC_SUPABASE_ANON_KEY=<from 'supabase start' output>\n` +
    'See docs/ENV_SETUP.md for details.'
  )
}

// In production, warn if environment variables are missing (but don't throw during build)
// During build/static generation, env vars might not be available, so we allow fallback values
// The actual error will be thrown at runtime when Supabase is used if vars are still missing
if ((!supabaseUrl || !supabaseKey) && process.env.NODE_ENV === 'production') {
  // Only log a warning, don't throw - this allows the build to complete
  // The app will fail at runtime if Supabase is actually used without proper credentials
  if (typeof window !== 'undefined') {
    console.error(
      'Missing Supabase environment variables in production. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }
}

// Create a singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(finalUrl, finalKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'tmw-ppl-auth',
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
  is_private?: boolean
  guest_list_visibility?: 'public' | 'rsvp_only' | 'hidden'
  created_by: string
  created_at: string
  updated_at: string
  // Creator information from join
  creator?: {
    full_name: string
    email: string
  }
}

export interface EventInvitation {
  id: string
  event_id: string
  user_id?: string
  email?: string
  invited_by: string
  created_at: string
  accepted_at?: string
  // Joined data
  profile?: Profile
}

export interface EventComment {
  id: string
  event_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  // Joined data
  profile?: Profile
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
