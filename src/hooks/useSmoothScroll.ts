import { useEffect } from 'react'

export const useSmoothScroll = () => {
  useEffect(() => {
    const handleSmoothScroll = (e: Event) => {
      const target = e.target as HTMLAnchorElement
      const href = target.getAttribute('href')
      
      if (href && href.startsWith('#')) {
        e.preventDefault()
        const id = href.substring(1)
        const element = document.getElementById(id)
        
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }
      }
    }

    // Add event listener to document for anchor clicks
    document.addEventListener('click', handleSmoothScroll)
    
    return () => {
      document.removeEventListener('click', handleSmoothScroll)
    }
  }, [])
}
