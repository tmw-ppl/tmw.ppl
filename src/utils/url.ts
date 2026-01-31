/**
 * Get the base URL for the application
 * Uses environment variables with fallbacks for different environments
 */
export function getBaseUrl(): string {
  // In production, prefer NEXT_PUBLIC_SITE_URL if set
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  // On Vercel, use VERCEL_URL (automatically set)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // In development, use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }

  // Fallback for production (should be set via NEXT_PUBLIC_SITE_URL)
  return 'https://mysection.vercel.app'
}

/**
 * Get the base URL for client-side usage
 * Falls back to window.location.origin if environment variables aren't available
 */
export function getClientBaseUrl(): string {
  // Server-side rendering
  if (typeof window === 'undefined') {
    return getBaseUrl()
  }

  // Client-side: prefer environment variable, fallback to window.location.origin
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  // Use window.location.origin as fallback (works in most cases)
  return window.location.origin
}


