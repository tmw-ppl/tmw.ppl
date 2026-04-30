'use client'

import React from 'react'

/** Location strings we should not try to show on a map (virtual/online) */
const VIRTUAL_LOCATION_PATTERNS = [
  'virtual event',
  'online',
  'zoom',
  'meet.google',
  'teams.microsoft',
  'webinar',
  'https://',
  'http://',
]

function isPhysicalLocation(location: string): boolean {
  if (!location || !location.trim()) return false
  const lower = location.toLowerCase().trim()
  if (VIRTUAL_LOCATION_PATTERNS.some((p) => lower.includes(p))) return false
  return true
}

interface EventLocationMapProps {
  /** Full address or place name (e.g. from Google Places) */
  address: string
  /** Height of the map in pixels. Google recommends min 200px. */
  height?: number
  /** Optional class name for the wrapper */
  className?: string
  /** Inline styles for the wrapper */
  style?: React.CSSProperties
}

/**
 * Renders a small map preview for an event location using Google Maps Embed (place mode).
 * Does not render for virtual/online locations.
 */
export default function EventLocationMap({
  address,
  height = 200,
  className,
  style,
}: EventLocationMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!isPhysicalLocation(address)) return null
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return (
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={{
          display: 'block',
          padding: '0.75rem',
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: 'var(--primary)',
          textDecoration: 'none',
          ...style,
        }}
      >
        📍 View “{address}” on Google Maps
      </a>
    )
  }

  const q = encodeURIComponent(address)
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${q}`

  return (
    <div
      className={className}
      style={{
        width: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg-2)',
        ...style,
      }}
    >
      <iframe
        title={`Map: ${address}`}
        src={embedUrl}
        width="100%"
        height={height}
        style={{ border: 0, display: 'block' }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}

export { isPhysicalLocation }
