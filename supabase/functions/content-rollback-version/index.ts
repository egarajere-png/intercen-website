// supabase/functions/content-rollback-version/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface RollbackRequest {
  content_id: string
  target_version: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    console.log('=== CONTENT ROLLBACK VERSION FUNCTION START ===')
    
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Authenticate user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('User authenticated:', user.id)

    // Parse request body
    let body: RollbackRequest
    try {
      body = await req.json()
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { content_id, target_version } = body

    if (!content_id) {
      return new Response(JSON.stringify({ error: 'content_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!target_version) {
      return new Response(JSON.stringify({ error: 'target_version is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Rolling back content ${content_id} to version ${target_version}`)

    // Fetch current content
    const { data: content, error: fetchError } = await supabaseAdmin
      .from('content')
      .select('*')
      .eq('id', content_id)
      .single()

    if (fetchError || !content) {
      return new Response(JSON.stringify({ error: 'Content not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Content found:', content.title)

    // Verify permissions
    let hasPermission = content.uploaded_by === user.id

    if (!hasPermission && content.organization_id) {
      const { data: orgMember } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('organization_id', content.organization_id)
        .eq('user_id', user.id)
        .single()

      if (orgMember && ['admin', 'moderator'].includes(orgMember.role)) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Permission granted')

    // Fetch target version from history
    const { data: targetVersionData, error: versionError } = await supabaseAdmin
      .from('content_version_history')
      .select('*')
      .eq('content_id', content_id)
      .eq('version_number', target_version)
      .single()

    if (versionError || !targetVersionData) {
      return new Response(JSON.stringify({ 
        error: 'Target version not found',
        details: `Version ${target_version} does not exist in history`
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Target version found in history')

    // Save current version to history before rollback
    const currentVersion = content.version || '1.0'
    const rollbackVersion = `${target_version}-rollback-${Date.now()}`

    if (content.file_url) {
      try {
        await supabaseAdmin
          .from('content_version_history')
          .insert({
            content_id: content_id,
            version_number: currentVersion,
            file_url: content.file_url,
            file_size_bytes: content.file_size_bytes,
            format: content.format,
            change_summary: `Saved before rollback to ${target_version}`,
            changed_by: user.id,
          })
        console.log('Current version saved to history')
      } catch (err) {
        console.warn('Failed to save current version:', err)
      }
    }

    // Perform rollback
    const { data: rolledBackContent, error: rollbackError } = await supabaseAdmin
      .from('content')
      .update({
        version: target_version,
        file_url: targetVersionData.file_url,
        file_size_bytes: targetVersionData.file_size_bytes,
        format: targetVersionData.format,
        updated_at: new Date().toISOString(),
      })
      .eq('id', content_id)
      .select()
      .single()

    if (rollbackError) {
      console.error('Rollback error:', rollbackError)
      return new Response(JSON.stringify({
        error: 'Failed to rollback content',
        details: rollbackError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Log the rollback in version history
    await supabaseAdmin
      .from('content_version_history')
      .insert({
        content_id: content_id,
        version_number: target_version,
        file_url: targetVersionData.file_url,
        file_size_bytes: targetVersionData.file_size_bytes,
        format: targetVersionData.format,
        change_summary: `Rolled back from ${currentVersion} to ${target_version}`,
        changed_by: user.id,
      })

    // Fetch updated version history
    const { data: versionHistory } = await supabaseAdmin
      .rpc('get_content_version_history', { p_content_id: content_id })

    console.log('Rollback completed successfully')

    return new Response(
      JSON.stringify({
        message: 'Successfully rolled back to previous version',
        content: rolledBackContent,
        version_history: versionHistory || [],
        metadata: {
          previous_version: currentVersion,
          rolled_back_to: target_version,
          rollback_timestamp: new Date().toISOString(),
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('=== UNEXPECTED ERROR ===')
    console.error('Type:', error.constructor?.name || 'Unknown')
    console.error('Message:', error.message || 'No message')
    console.error('Stack:', error.stack || 'No stack')

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message || 'Unknown error',
        type: error.constructor?.name || 'Error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})