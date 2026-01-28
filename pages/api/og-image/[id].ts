import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// API route that serves the event's image directly (not a redirect)
// This helps with iMessage previews which may not follow redirects
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing event ID' })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.redirect(302, '/assets/section-logo-20260115.png')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: event, error } = await supabase
      .from('events')
      .select('image_url')
      .eq('id', id)
      .single()

    if (error || !event?.image_url) {
      return res.redirect(302, '/assets/section-logo-20260115.png')
    }

    // Fetch the actual image from Supabase storage
    const imageResponse = await fetch(event.image_url)
    
    if (!imageResponse.ok) {
      return res.redirect(302, '/assets/section-logo-20260115.png')
    }

    // Get content type from the response
    const contentType = imageResponse.headers.get('content-type') || 'image/png'
    
    // Get the image as a buffer
    const imageBuffer = await imageResponse.arrayBuffer()

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400')
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', imageBuffer.byteLength)
    
    // Send the image directly
    return res.send(Buffer.from(imageBuffer))
  } catch (err) {
    console.error('Error fetching event image:', err)
    return res.redirect(302, '/assets/section-logo-20260115.png')
  }
}

