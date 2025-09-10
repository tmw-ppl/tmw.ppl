// Authentication Manager
class AuthManager {
  constructor() {
    this.user = null
    this.supabase = null
    this.init()
  }

  async init() {
    // Wait for Supabase client to be available
    const checkSupabase = () => {
      if (window.supabaseClient) {
        this.supabase = window.supabaseClient
        this.setupAuth()
      } else {
        setTimeout(checkSupabase, 100)
      }
    }
    checkSupabase()
  }

  async setupAuth() {
    try {
      console.log('Setting up auth...')
      
      // Check for existing session
      const { data: { session } } = await this.supabase.auth.getSession()
      this.user = session?.user || null
      
      console.log('Session check result:', this.user ? 'User found' : 'No user')
      
      // Listen for auth changes
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'no user')
        this.user = session?.user || null
        this.updateUI()
        this.updateAuthButton()
      })
      
      this.updateUI()
      this.updateAuthButton()
      console.log('Auth manager initialized successfully')
    } catch (error) {
      console.error('Error initializing auth manager:', error)
    }
  }

  async signUp(email, password, name) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    })
    
    console.log('Signup result:', { data, error });
    
    // Create profile record
    if (data.user && !error) {
      try {
        await this.supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: name,
            email: email
          })
        console.log('Profile created successfully');
      } catch (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }
    
    return { data, error }
  }

  async signIn(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    this.user = null
    this.updateUI()
    this.updateAuthButton()
    return { error }
  }

  updateUI() {
    // This will be used by pages that need to update their UI based on auth state
    const authSection = document.getElementById('auth-section')
    const userSection = document.getElementById('user-section')
    
    if (authSection && userSection) {
      if (this.user) {
        authSection.style.display = 'none'
        userSection.style.display = 'block'
        const userEmail = document.getElementById('user-email')
        if (userEmail) userEmail.textContent = this.user.email
      } else {
        authSection.style.display = 'block'
        userSection.style.display = 'none'
      }
    }
  }

  updateAuthButton() {
    const authBtn = document.getElementById('auth-nav-btn')
    if (authBtn) {
      if (this.user) {
        authBtn.textContent = 'Profile'
        authBtn.href = 'profile.html'
        authBtn.className = 'btn secondary'
      } else {
        authBtn.textContent = 'Sign In'
        authBtn.href = 'auth.html'
        authBtn.className = 'btn secondary'
      }
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.user
  }

  // Get current user
  getCurrentUser() {
    return this.user
  }
}

// Make available globally
window.authManager = new AuthManager()
