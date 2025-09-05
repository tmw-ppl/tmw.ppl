// Supabase configuration
// Replace these with your actual Supabase project values

const supabaseUrl = 'https://eloardiuuuuuuvecrooo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsb2FyZGl1dXV1dXV2ZWNyb29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMDAxNTQsImV4cCI6MjA3MjY3NjE1NH0.1VdDRP3df1v5gJWp56P1_KwX87LceDp6JMaIyogkOHU'

// Wait for Supabase to load, then create client
document.addEventListener('DOMContentLoaded', function() {
  if (typeof supabase !== 'undefined') {
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)
    window.supabaseClient = supabaseClient
    console.log('Supabase client initialized successfully')
  } else {
    console.error('Supabase library not loaded')
  }
})
