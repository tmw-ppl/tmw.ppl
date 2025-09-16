import React, { useRef, useEffect, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

interface LocationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export default function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Enter location", 
  required = false 
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    const initializeAutocomplete = async () => {
      // Check if we have an API key
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
        console.warn('Google Maps API key not found or not set. Using regular input.')
        setIsLoaded(true)
        setHasApiKey(false)
        return
      }

      setHasApiKey(true)

      try {
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places']
        })

        await loader.load()

        if (inputRef.current) {
          // Use the old but stable Autocomplete (still supported)
          const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            types: ['establishment', 'geocode'],
            fields: ['formatted_address', 'geometry', 'name', 'place_id', 'types']
          })

          // Handle place selection
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace()
            
            // Prefer formatted_address, fallback to name
            const locationText = place.formatted_address || place.name || ''
            
            if (locationText) {
              onChange(locationText)
            }
          })

          autocompleteRef.current = autocomplete
        }

        setIsLoaded(true)
      } catch (error) {
        console.error('Error loading Google Maps:', error)
        setIsLoaded(true)
        setHasApiKey(false)
      }
    }

    initializeAutocomplete()

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [onChange])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="location-autocomplete">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        required={required}
        className="location-input"
        autoComplete="off"
      />
      {!isLoaded && hasApiKey && (
        <div className="loading-indicator">
          <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            Loading Maps...
          </span>
        </div>
      )}
      {isLoaded && !hasApiKey && (
        <div className="loading-indicator">
          <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            💡 Add Google Maps API key for autocomplete
          </span>
        </div>
      )}
    </div>
  )
}
