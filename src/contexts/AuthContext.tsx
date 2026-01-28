import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, type AuthUser, type AuthSession } from '../lib/supabase'

interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  signUp: (email: string, password: string, name: string, phone: string) => Promise<{ data: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ data: any; error: any }>
  updatePassword: (newPassword: string) => Promise<{ data: any; error: any }>
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
      resetPassword: async () => ({ data: null, error: { message: 'Auth not initialized' } }),
      updatePassword: async () => ({ data: null, error: { message: 'Auth not initialized' } }),
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
        } as any,
        emailRedirectTo: `${window.location.origin}/confirm`
      }
    })

    // Ensure profile exists (database trigger should create it, but this is a fallback)
    if (data.user && !error) {
      try {
        // Check if profile already exists (trigger may have created it)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        // Only create if it doesn't exist
        if (!existingProfile) {
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
        } else {
          // Profile exists, but update it with the latest signup data in case metadata changed
          const { error: updateError } = await (supabase
            .from('profiles') as any)
            .update({
              full_name: name,
              email: email,
              phone: phone,
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', data.user.id)
          if (updateError) {
            console.error('Error updating profile:', updateError)
          }
        }
      } catch (profileError) {
        console.error('Error ensuring profile exists:', profileError)
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

  const resetPassword = async (email: string) => {
    // Get the base URL dynamically based on environment
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    (typeof window !== 'undefined' ? window.location.origin : 'https://mysection.vercel.app')
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/reset-password`,
    })
    return { data, error }
  }

  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { data, error }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
