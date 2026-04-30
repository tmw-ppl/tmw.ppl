/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  //   typescript: { ignoreBuildErrors: true },

  // Make dev mode more similar to production
  swcMinify: true,

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  reactStrictMode: true,
}

module.exports = nextConfig
