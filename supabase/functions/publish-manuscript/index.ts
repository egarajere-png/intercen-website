// supabase/functions/publish-manuscript/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Auth
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse body
    const { publication_id } = await req.json()
    if (!publication_id) {
      return new Response(JSON.stringify({ error: 'publication_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch manuscript
    const { data: manuscript, error: fetchError } = await supabase
      .from('publications')
      .select('*')
      .eq('id', publication_id)
      .single()
    if (fetchError || !manuscript) {
      return new Response(JSON.stringify({ error: 'Manuscript not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Only allow approved manuscripts
    if (manuscript.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Manuscript is not approved' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check for existing published content
    const { data: existingContent } = await supabase
      .from('content')
      .select('id')
      .eq('publication_id', publication_id)
      .maybeSingle()
    if (existingContent) {
      return new Response(JSON.stringify({ error: 'Content already published for this manuscript' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Transform and insert into content
    const contentInsert = {
      publication_id: manuscript.id,
      title: manuscript.title,
      subtitle: manuscript.subtitle,
      description: manuscript.description,
      author_name: manuscript.author_name,
      cover_image_url: manuscript.cover_image_url,
      file_url: manuscript.manuscript_file_url,
      content_type: 'book', // or derive from manuscript if needed
      language: manuscript.language,
      status: 'published',
      published_at: new Date().toISOString(),
      // Add other fields as needed (category_id, price, etc.)
      // ...manuscript fields mapping...
    }


    const { data: content, error: insertError } = await supabase
      .from('content')
      .insert(contentInsert)
      .select()
      .single()
    if (insertError) {
      return new Response(JSON.stringify({ error: 'Failed to publish content', details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!content || !content.id) {
      return new Response(JSON.stringify({ error: 'Content published but no content ID returned. Check table schema and permissions.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Optionally update manuscript status
    await supabase
      .from('publications')
      .update({ status: 'published' })
      .eq('id', publication_id)

    // Optionally send notification to author
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: manuscript.submitted_by,
        type: 'content_published',
        title: 'Your manuscript has been published!',
        message: `Congratulations! Your manuscript "${manuscript.title}" is now published.`,
        content_id: content.id,
        read: false,
        created_at: new Date().toISOString(),
      })
    if (notificationError) {
      return new Response(JSON.stringify({ error: 'Content published but failed to notify author', details: notificationError.message, content }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      message: 'Content published successfully',
      content,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
      type: error.constructor?.name || 'Error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})