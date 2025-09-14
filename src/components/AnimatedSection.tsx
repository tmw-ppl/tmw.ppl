import React from 'react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

interface AnimatedSectionProps {
  children: React.ReactNode
  animationType?: 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale' | 'rotate'
  delay?: number
  className?: string
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  animationType = 'fade',
  delay = 0,
  className = ''
}) => {
  const [ref, isVisible] = useScrollAnimation({
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  })

  const getAnimationClass = () => {
    const baseClass = `scroll-animate-${animationType.replace('up', '')}`
    return isVisible ? `${baseClass} visible` : baseClass
  }

  const style = delay > 0 ? { transitionDelay: `${delay}ms` } : {}

  return (
    <div
      ref={ref}
      className={`${getAnimationClass()} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

export default AnimatedSection
