/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  //   typescript: { ignoreBuildErrors: true },
  
  // Make dev mode more similar to production
  // This helps catch production-only issues during development
  swcMinify: true, // Use SWC minification (same as production)
  
  // Enable production-like CSS processing
  compiler: {
    // Remove console logs in production, but keep them in dev for debugging
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Ensure CSS is processed consistently
  // This helps match production behavior in dev mode
  reactStrictMode: true,
}

module.exports = nextConfig
