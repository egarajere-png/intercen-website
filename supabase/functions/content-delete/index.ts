// supabase/functions/content-delete/index.ts
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface DeleteRequest {
  content_id: string
  force_delete?: boolean // If true, delete even if has orders (admin only)
}

Deno.serve(async (req) => {
  // CRITICAL: Handle OPTIONS request FIRST, before any other code
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    console.log('=== CONTENT DELETE FUNCTION START ===')
    
    if (req.method !== 'POST' && req.method !== 'DELETE') {
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
    let body: DeleteRequest
    try {
      body = await req.json()
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { content_id, force_delete = false } = body

    if (!content_id) {
      return new Response(JSON.stringify({ error: 'content_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Attempting to delete content: ${content_id}`)

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

    // Verify ownership or admin rights
    let hasPermission = content.uploaded_by === user.id
    let isAdmin = false

    if (!hasPermission && content.organization_id) {
      // Check if user is admin of the organization
      const { data: orgMember } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('organization_id', content.organization_id)
        .eq('user_id', user.id)
        .single()

      if (orgMember && orgMember.role === 'admin') {
        hasPermission = true
        isAdmin = true
      }
    }

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Permission granted')

    // Check if content has been purchased (has orders)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('order_items')
      .select('id')
      .eq('content_id', content_id)
      .limit(1)

    const hasPurchases = orders && orders.length > 0

    if (hasPurchases) {
      console.log('Content has purchases - checking force_delete flag')
    }

    // Check if content is in any carts
    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from('cart_items')
      .select('id')
      .eq('content_id', content_id)

    const inCarts = cartItems && cartItems.length > 0

    // Determine if we can hard delete
    const canHardDelete = !hasPurchases || (force_delete && isAdmin)

    if (!canHardDelete) {
      console.log('Cannot hard delete - archiving instead')

      // Soft delete: Archive the content
      const { data: archivedContent, error: archiveError } = await supabaseAdmin
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

      if (archiveError) {
        console.error('Archive error:', archiveError)
        return new Response(JSON.stringify({
          error: 'Failed to archive content',
          details: archiveError.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Log the archive action
      await logAudit(supabaseAdmin, {
        user_id: user.id,
        action: 'content_archived',
        entity_type: 'content',
        entity_id: content_id,
        details: {
          reason: 'Has purchases - cannot hard delete',
          content_title: content.title,
          purchase_count: orders?.length || 0,
        }
      })

      console.log('Content archived successfully')

      return new Response(
        JSON.stringify({
          message: 'Content archived successfully (cannot delete due to existing purchases)',
          action: 'archived',
          content: archivedContent,
          metadata: {
            has_purchases: true,
            purchase_count: orders?.length || 0,
            in_carts: inCarts,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Proceed with hard delete
    console.log('Proceeding with hard delete...')

    // Step 1: Delete files from storage
    const storageErrors: string[] = []

    if (content.file_url) {
      try {
        const filePath = extractStoragePath(content.file_url)
        const bucket = determineBucket(content.file_url)
        
        if (filePath && bucket) {
          console.log(`Deleting file from ${bucket}: ${filePath}`)
          const { error: fileDeleteError } = await supabaseAdmin.storage
            .from(bucket)
            .remove([filePath])

          if (fileDeleteError) {
            console.warn('File delete error:', fileDeleteError.message)
            storageErrors.push(`Content file: ${fileDeleteError.message}`)
          } else {
            console.log('Content file deleted successfully')
          }
        }
      } catch (err) {
        console.warn('Error deleting content file:', err)
        storageErrors.push(`Content file: ${err.message}`)
      }
    }

    if (content.cover_image_url) {
      try {
        const coverPath = extractStoragePath(content.cover_image_url)
        const coverBucket = 'book-covers'
        
        if (coverPath) {
          console.log(`Deleting cover from ${coverBucket}: ${coverPath}`)
          const { error: coverDeleteError } = await supabaseAdmin.storage
            .from(coverBucket)
            .remove([coverPath])

          if (coverDeleteError) {
            console.warn('Cover delete error:', coverDeleteError.message)
            storageErrors.push(`Cover image: ${coverDeleteError.message}`)
          } else {
            console.log('Cover image deleted successfully')
          }
        }
      } catch (err) {
        console.warn('Error deleting cover image:', err)
        storageErrors.push(`Cover image: ${err.message}`)
      }
    }

    // Step 2: Delete from cart_items (if any)
    if (inCarts) {
      console.log('Removing from carts...')
      const { error: cartDeleteError } = await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('content_id', content_id)

      if (cartDeleteError) {
        console.warn('Cart items delete error:', cartDeleteError.message)
      } else {
        console.log(`Removed from ${cartItems?.length || 0} carts`)
      }
    }

    // Step 3: Delete version history
    const { error: versionDeleteError } = await supabaseAdmin
      .from('content_version_history')
      .delete()
      .eq('content_id', content_id)

    if (versionDeleteError) {
      console.warn('Version history delete error:', versionDeleteError.message)
    } else {
      console.log('Version history deleted')
    }

    // Step 4: Delete content tags
    const { error: tagsDeleteError } = await supabaseAdmin
      .from('content_tags')
      .delete()
      .eq('content_id', content_id)

    if (tagsDeleteError) {
      console.warn('Tags delete error:', tagsDeleteError.message)
    } else {
      console.log('Content tags deleted')
    }

    // Step 5: Delete reviews (if cascade is not set up)
    const { error: reviewsDeleteError } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('content_id', content_id)

    if (reviewsDeleteError) {
      console.warn('Reviews delete error:', reviewsDeleteError.message)
    } else {
      console.log('Reviews deleted')
    }

    // Step 6: Delete the content record (this will cascade to other related tables)
    const { error: contentDeleteError } = await supabaseAdmin
      .from('content')
      .delete()
      .eq('id', content_id)

    if (contentDeleteError) {
      console.error('Content delete error:', contentDeleteError)
      return new Response(JSON.stringify({
        error: 'Failed to delete content',
        details: contentDeleteError.message,
        storage_errors: storageErrors.length > 0 ? storageErrors : undefined,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Content deleted successfully from database')

    // Log the deletion
    await logAudit(supabaseAdmin, {
      user_id: user.id,
      action: 'content_deleted',
      entity_type: 'content',
      entity_id: content_id,
      details: {
        content_title: content.title,
        content_type: content.content_type,
        had_purchases: hasPurchases,
        force_deleted: force_delete && isAdmin,
        storage_errors: storageErrors.length > 0 ? storageErrors : undefined,
      }
    })

    console.log('Delete operation completed successfully')

    return new Response(
      JSON.stringify({
        message: 'Content deleted successfully',
        action: 'deleted',
        metadata: {
          content_title: content.title,
          files_deleted: {
            content_file: !!content.file_url && storageErrors.length === 0,
            cover_image: !!content.cover_image_url && storageErrors.length === 0,
          },
          storage_errors: storageErrors.length > 0 ? storageErrors : undefined,
          removed_from_carts: inCarts ? cartItems?.length || 0 : 0,
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

// Helper function to extract storage path from URL
function extractStoragePath(url: string): string | null {
  try {
    // Example URL: https://project.supabase.co/storage/v1/object/public/bucket-name/user-id/file.pdf
    // or: https://project.supabase.co/storage/v1/object/sign/bucket-name/user-id/file.pdf?token=...
    
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    
    // Find the index of the bucket name (after 'public' or 'sign')
    const bucketIndex = pathParts.findIndex(part => part === 'public' || part === 'sign')
    
    if (bucketIndex >= 0 && pathParts.length > bucketIndex + 2) {
      // Everything after the bucket name is the file path
      const filePath = pathParts.slice(bucketIndex + 2).join('/')
      return filePath
    }
    
    return null
  } catch (err) {
    console.error('Error extracting storage path:', err)
    return null
  }
}

// Helper function to determine bucket from URL
function determineBucket(url: string): string | null {
  try {
    if (url.includes('/book-files/')) return 'book-files'
    if (url.includes('/book-covers/')) return 'book-covers'
    if (url.includes('/manuscripts/')) return 'manuscripts'
    if (url.includes('/documets/')) return 'documets'
    
    // Fallback: try to extract from URL path
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const bucketIndex = pathParts.findIndex(part => part === 'public' || part === 'sign')
    
    if (bucketIndex >= 0 && pathParts.length > bucketIndex + 1) {
      return pathParts[bucketIndex + 1]
    }
    
    return null
  } catch (err) {
    console.error('Error determining bucket:', err)
    return null
  }
}

// Helper function to log audit trail
async function logAudit(
  supabase: any,
  data: {
    user_id: string
    action: string
    entity_type: string
    entity_id: string
    details: any
  }
) {
  try {
    const auditLog = {
      ...data,
      created_at: new Date().toISOString(),
      ip_address: null, // Could be extracted from headers if needed
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert(auditLog)

    if (error) {
      console.warn('Failed to create audit log:', error.message)
    } else {
      console.log('Audit log created:', data.action)
    }
  } catch (err) {
    console.error('Audit log error:', err)
  }
}