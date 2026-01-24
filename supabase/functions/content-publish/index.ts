// supabase/functions/content-publish/index.ts
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MIN_DESCRIPTION_LENGTH = 50

interface PublishRequest {
  content_id: string
  action: 'publish' | 'unpublish'
  send_notification?: boolean
}

interface ValidationError {
  field: string
  message: string
}

Deno.serve(async (req) => {
  try {
    console.log('=== CONTENT PUBLISH FUNCTION START ===')
    
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST' && req.method !== 'PUT') {
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
    let body: PublishRequest
    try {
      body = await req.json()
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { content_id, action, send_notification = true } = body

    if (!content_id) {
      return new Response(JSON.stringify({ error: 'content_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!action || !['publish', 'unpublish'].includes(action)) {
      return new Response(JSON.stringify({ 
        error: 'action is required and must be "publish" or "unpublish"' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Action: ${action} for content: ${content_id}`)

    // Fetch existing content
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

    // Verify ownership
    let hasPermission = content.uploaded_by === user.id

    if (!hasPermission && content.organization_id) {
      // Check if user is admin of the organization
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

    // Handle publishing
    if (action === 'publish') {
      console.log('Publishing content...')

      // Validate required fields
      const validationErrors: ValidationError[] = []

      if (!content.cover_image_url) {
        validationErrors.push({
          field: 'cover_image_url',
          message: 'Cover image is required for publishing'
        })
      }

      // Removed description length check

      if (content.is_for_sale && (!content.price || content.price <= 0)) {
        validationErrors.push({
          field: 'price',
          message: 'Price must be greater than 0 for items marked for sale'
        })
      }

      if (content.is_for_sale && (!content.stock_quantity || content.stock_quantity <= 0)) {
        validationErrors.push({
          field: 'stock_quantity',
          message: 'Stock quantity must be greater than 0 for items marked for sale'
        })
      }

      if (!content.file_url) {
        validationErrors.push({
          field: 'file_url',
          message: 'Content file is required for publishing'
        })
      }

      if (validationErrors.length > 0) {
        console.log('Validation failed:', validationErrors)
        return new Response(JSON.stringify({
          error: 'Validation failed',
          validation_errors: validationErrors
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check if already published
      if (content.status === 'published') {
        return new Response(JSON.stringify({
          message: 'Content is already published',
          content
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Update to published
      const { data: updatedContent, error: updateError } = await supabaseAdmin
        .from('content')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', content_id)
        .select()
        .single()

      if (updateError) {
        console.error('Update error:', updateError)
        return new Response(JSON.stringify({
          error: 'Failed to publish content',
          details: updateError.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log('Content published successfully')

      // Send notification if enabled
      if (send_notification) {
        try {
          await sendPublishNotification(supabaseAdmin, updatedContent, user)
        } catch (notifErr) {
          console.warn('Notification failed:', notifErr)
          // Don't fail the request if notification fails
        }
      }

      return new Response(
        JSON.stringify({
          message: 'Content published successfully',
          content: updatedContent,
          metadata: {
            published_at: updatedContent.published_at,
            previous_status: content.status,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Handle unpublishing
    if (action === 'unpublish') {
      console.log('Unpublishing content...')

      if (content.status !== 'published') {
        return new Response(JSON.stringify({
          message: 'Content is not currently published',
          content
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Update to archived and remove from featured sections
      const { data: updatedContent, error: updateError } = await supabaseAdmin
        .from('content')
        .update({
          status: 'archived',
          is_featured: false,
          is_bestseller: false,
          is_new_arrival: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', content_id)
        .select()
        .single()

      if (updateError) {
        console.error('Update error:', updateError)
        return new Response(JSON.stringify({
          error: 'Failed to unpublish content',
          details: updateError.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log('Content unpublished successfully')

      // Send notification if enabled
      if (send_notification) {
        try {
          await sendUnpublishNotification(supabaseAdmin, updatedContent, user)
        } catch (notifErr) {
          console.warn('Notification failed:', notifErr)
        }
      }

      return new Response(
        JSON.stringify({
          message: 'Content unpublished successfully',
          content: updatedContent,
          metadata: {
            previous_status: content.status,
            removed_from: {
              featured: content.is_featured,
              bestseller: content.is_bestseller,
              new_arrival: content.is_new_arrival,
            }
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

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

// Helper function to send publish notification
async function sendPublishNotification(
  supabase: any,
  content: any,
  user: any
) {
  console.log('Sending publish notification...')

  try {
    // Create notification record
    const notification = {
      user_id: content.uploaded_by,
      type: 'content_published',
      title: 'Content Published',
      message: `Your content "${content.title}" has been published successfully!`,
      content_id: content.id,
      read: false,
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('notifications')
      .insert(notification)

    if (error) {
      console.warn('Failed to create notification:', error.message)
    } else {
      console.log('Publish notification created')
    }

    // If organization content, notify org members
    if (content.organization_id) {
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', content.organization_id)
        .neq('user_id', content.uploaded_by)

      if (orgMembers && orgMembers.length > 0) {
        const orgNotifications = orgMembers.map((member: any) => ({
          user_id: member.user_id,
          type: 'org_content_published',
          title: 'New Organization Content',
          message: `"${content.title}" has been published in your organization`,
          content_id: content.id,
          read: false,
          created_at: new Date().toISOString(),
        }))

        await supabase
          .from('notifications')
          .insert(orgNotifications)

        console.log(`Notified ${orgMembers.length} organization members`)
      }
    }
  } catch (err) {
    console.error('Notification error:', err)
    throw err
  }
}

// Helper function to send unpublish notification
async function sendUnpublishNotification(
  supabase: any,
  content: any,
  user: any
) {
  console.log('Sending unpublish notification...')

  try {
    const notification = {
      user_id: content.uploaded_by,
      type: 'content_unpublished',
      title: 'Content Unpublished',
      message: `Your content "${content.title}" has been unpublished and archived.`,
      content_id: content.id,
      read: false,
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('notifications')
      .insert(notification)

    if (error) {
      console.warn('Failed to create notification:', error.message)
    } else {
      console.log('Unpublish notification created')
    }
  } catch (err) {
    console.error('Notification error:', err)
    throw err
  }
}