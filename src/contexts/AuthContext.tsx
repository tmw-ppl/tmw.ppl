import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, type AuthUser, type AuthSession } from '../lib/supabase'

interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  signUp: (email: string, password: string, name: string, phone: string) => Promise<{ data: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // Return a default context instead of throwing to prevent crashes during hot reload
    return {
      user: null,
      session: null,
      loading: true,
      signUp: async () => ({ data: null, error: { message: 'Auth not initialized' } }),
      signIn: async () => ({ data: null, error: { message: 'Auth not initialized' } }),
      signOut: async () => ({ error: { message: 'Auth not initialized' } }),
      isAuthenticated: false
    }
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  // Ensure user has a profile in the database
  const ensureProfileExists = async (authUser: AuthUser) => {
    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .single()

      // If profile doesn't exist, create it
      if (checkError && checkError.code === 'PGRST116') {
        console.log('Creating profile for existing user:', authUser.id)
        
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
            phone: (authUser.user_metadata as any)?.phone || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any)

        if (createError) {
          console.error('Error creating profile for existing user:', createError)
        } else {
          console.log('Profile created successfully for existing user')
        }
      } else if (checkError) {
        console.error('Error checking profile existence:', checkError)
      }
    } catch (error) {
      console.error('Error in ensureProfileExists:', error)
    }
  }

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        }
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          
          // Auto-create profile for signed-in users who don't have one
          if (event === 'SIGNED_IN' && session?.user) {
            await ensureProfileExists(session.user)
          }
          
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone: phone
        } as any
      }
    })

    // Create profile record if signup was successful
    if (data.user && !error) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: name,
            email: email,
            phone: phone,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any)
        if (profileError) {
          console.error('Error creating profile:', profileError)
        }
      } catch (profileError) {
        console.error('Error creating profile:', profileError)
      }
    }

    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
