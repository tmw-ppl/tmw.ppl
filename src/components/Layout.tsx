import React from 'react'
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
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default Layout
