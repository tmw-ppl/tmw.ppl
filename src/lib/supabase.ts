import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eloardiuuuuuuvecrooo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsb2FyZGl1dXV1dXV2ZWNyb29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMDAxNTQsImV4cCI6MjA3MjY3NjE1NH0.1VdDRP3df1v5gJWp56P1_KwX87LceDp6JMaIyogkOHU'

// Create a singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
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
}
