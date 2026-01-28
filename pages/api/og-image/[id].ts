import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// API route that redirects to the event's image
// This helps with iMessage previews which may not like cross-domain images
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
      // Fallback to default logo
      return res.redirect(302, '/assets/section-logo-20260115.png')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: event, error } = await supabase
      .from('events')
      .select('image_url')
      .eq('id', id)
      .single()

    if (error || !event?.image_url) {
      // Fallback to default logo
      return res.redirect(302, '/assets/section-logo-20260115.png')
    }

    // Set cache headers for the redirect
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
    
    // Redirect to the actual image
    return res.redirect(302, event.image_url)
  } catch (err) {
    console.error('Error fetching event image:', err)
    return res.redirect(302, '/assets/section-logo-20260115.png')
  }
}

