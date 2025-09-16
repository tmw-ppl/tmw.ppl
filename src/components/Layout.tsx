import React from 'react'
import Head from 'next/head'
import Header from './Header'
import Footer from './Footer'
import { useSmoothScroll } from '../hooks/useSmoothScroll'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  useSmoothScroll()

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Favicon and App Icons */}
        <link rel="icon" type="image/png" href="/assets/logo-original.png" />
        <link rel="shortcut icon" type="image/png" href="/assets/logo-original.png" />
        <link rel="apple-touch-icon" href="/assets/logo-original.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/logo-original.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/assets/logo-original.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/assets/logo-original.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/assets/logo-original.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/assets/logo-original.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/assets/logo-original.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/assets/logo-original.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/assets/logo-original.png" />
        <link rel="apple-touch-icon" sizes="57x57" href="/assets/logo-original.png" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="TMW People - Community Ideas & Events" />
        <meta property="og:description" content="Join the TMW community! Discover events, share ideas, and connect with like-minded people. Swipe through community ideas and vote on what matters to you." />
        <meta property="og:image" content="/assets/logo-gradient.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="TMW People Logo" />
        <meta property="og:url" content="https://tmw.ppl" />
        <meta property="og:site_name" content="TMW People" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="TMW People - Community Ideas & Events" />
        <meta name="twitter:description" content="Join the TMW community! Discover events, share ideas, and connect with like-minded people." />
        <meta name="twitter:image" content="/assets/logo-gradient.png" />
        <meta name="twitter:image:alt" content="TMW People Logo" />
        
        {/* Additional Meta Tags */}
        <meta name="description" content="Join the TMW community! Discover events, share ideas, and connect with like-minded people. Swipe through community ideas and vote on what matters to you." />
        <meta name="keywords" content="TMW, community, events, ideas, voting, social, networking" />
        <meta name="author" content="TMW People" />
        <meta name="theme-color" content="#8b5cf6" />
        
        {/* Apple Specific */}
        <meta name="apple-mobile-web-app-title" content="TMW People" />
        <meta name="application-name" content="TMW People" />
      </Head>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default Layout
