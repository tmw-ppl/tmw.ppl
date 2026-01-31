import React, { useEffect } from 'react'
import Head from 'next/head'
import Header from './Header'
import Footer from './Footer'
import { useSmoothScroll } from '../hooks/useSmoothScroll'
import { getBaseUrl } from '../utils/url'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  useSmoothScroll()

  useEffect(() => {
    // Force dark mode on document element
    document.documentElement.classList.add('dark')
    // Ensure light-theme class is removed unless specifically requested later
    document.documentElement.classList.remove('light-theme')
  }, [])

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Favicon and App Icons */}
        <link rel="icon" type="image/png" href="/assets/section-logo-20260115.png" />
        <link rel="shortcut icon" type="image/png" href="/assets/section-logo-20260115.png" />
        <link rel="apple-touch-icon" href="/assets/section-logo-20260115.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/section-logo-20260115.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/assets/section-logo-20260115.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/assets/section-logo-20260115.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/assets/section-logo-20260115.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/assets/section-logo-20260115.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/assets/section-logo-20260115.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/assets/section-logo-20260115.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/assets/section-logo-20260115.png" />
        <link rel="apple-touch-icon" sizes="57x57" href="/assets/section-logo-20260115.png" />
        
        {/* Open Graph Meta Tags - Defaults (use key prop so pages can override) */}
        <meta key="og:type" property="og:type" content="website" />
        <meta key="og:title" property="og:title" content="Section - Community Event Sections" />
        <meta key="og:description" property="og:description" content="Discover and join event sections created by the community. Organize your events and connect with like-minded people." />
        <meta key="og:image" property="og:image" content={`${getBaseUrl()}/assets/section-logo-20260115.png`} />
        <meta key="og:url" property="og:url" content={getBaseUrl()} />
        <meta property="og:site_name" content="Section" />
        
        {/* Twitter Card Meta Tags - Defaults (use key prop so pages can override) */}
        <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
        <meta key="twitter:title" name="twitter:title" content="Section - Community Event Sections" />
        <meta key="twitter:description" name="twitter:description" content="Discover and join event sections created by the community. Organize your events and connect with like-minded people." />
        <meta key="twitter:image" name="twitter:image" content={`${getBaseUrl()}/assets/section-logo-20260115.png`} />
        <meta key="twitter:image:alt" name="twitter:image:alt" content="Section Logo" />
        
        {/* Additional Meta Tags */}
        <meta name="description" content="Discover and join event sections created by the community. Organize your events and connect with like-minded people." />
        <meta name="keywords" content="Section, community, events, sections, social, networking" />
        <meta name="author" content="Section" />
        <meta name="theme-color" content="#0b1220" />
        <meta name="color-scheme" content="dark" />
        
        {/* Apple Specific */}
        <meta name="apple-mobile-web-app-title" content="Section" />
        <meta name="application-name" content="Section" />
      </Head>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default Layout
