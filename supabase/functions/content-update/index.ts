// supabase/functions/content-update/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { multiParser } from 'https://deno.land/x/multiparser@0.114.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAX_COVER_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_BACKPAGE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_COVER_MIMES = ['image/jpeg', 'image/png', 'image/webp']

const validCoverExtensions = ['jpg', 'jpeg', 'png', 'webp']

const mimeMap: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

Deno.serve(async (req) => {
  try {
    console.log('=== CONTENT UPDATE FUNCTION START ===')
    
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

    // Parse form data
    let form
    try {
      form = await multiParser(req)
    } catch (e) {
      console.error('Parse error:', e.message)
      return new Response(JSON.stringify({ error: 'Failed to parse form', details: e.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!form?.fields) {
      return new Response(JSON.stringify({ error: 'Invalid form data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const f = form.fields
    const content_id = (f.content_id as string)?.trim()

    if (!content_id) {
      return new Response(JSON.stringify({ error: 'content_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Updating content:', content_id)

    // Fetch existing content
    const { data: existingContent, error: fetchError } = await supabaseAdmin
      .from('content')
      .select('*')
      .eq('id', content_id)
      .single()

    if (fetchError || !existingContent) {
      return new Response(JSON.stringify({ error: 'Content not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Existing content found:', existingContent.title)

    // Verify permissions: user is uploader OR org admin
    let hasPermission = existingContent.uploaded_by === user.id

    if (!hasPermission && existingContent.organization_id) {
      // Check if user is admin of the organization
      const { data: orgMember } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('organization_id', existingContent.organization_id)
        .eq('user_id', user.id)
        .single()

      if (orgMember && orgMember.role === 'admin') {
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

    // Handle image replacements
    const newCoverFile = form.files?.cover_image
    const newBackpageFile = form.files?.backpage_image
    let new_cover_url = existingContent.cover_image_url
    let new_backpage_url = existingContent.backpage_image_url

    // Handle cover image replacement
    if (newCoverFile) {
      console.log('New cover image detected')

      const coverExt = newCoverFile.filename.split('.').pop()?.toLowerCase() || 'jpg'
      const isValidCoverMime = newCoverFile.type && ALLOWED_COVER_MIMES.includes(newCoverFile.type)
      const isValidCoverExt = validCoverExtensions.includes(coverExt)

      if (!isValidCoverMime && !isValidCoverExt) {
        return new Response(JSON.stringify({
          error: 'Invalid cover image type',
          received_type: newCoverFile.type || 'undefined',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (newCoverFile.length > MAX_COVER_SIZE) {
        return new Response(JSON.stringify({ error: 'Cover too large (max 10MB)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      let effectiveCoverMime = newCoverFile.type
      if (!effectiveCoverMime || !ALLOWED_COVER_MIMES.includes(effectiveCoverMime)) {
        effectiveCoverMime = mimeMap[coverExt] || 'image/jpeg'
      }

      const coverPath = `${user.id}/covers/${crypto.randomUUID()}.${coverExt}`

      const { error: coverErr } = await supabaseAdmin.storage
        .from('book-covers')
        .upload(coverPath, newCoverFile.content, {
          contentType: effectiveCoverMime,
          upsert: false,
        })

      if (!coverErr) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('book-covers')
          .getPublicUrl(coverPath)
        new_cover_url = publicUrl
        console.log('New cover uploaded:', new_cover_url)
      } else {
        console.warn('Cover upload failed:', coverErr.message)
      }
    }

    // Handle backpage image replacement
    if (newBackpageFile) {
      console.log('New backpage image detected')

      const backpageExt = newBackpageFile.filename.split('.').pop()?.toLowerCase() || 'jpg'
      const isValidBackpageMime = newBackpageFile.type && ALLOWED_COVER_MIMES.includes(newBackpageFile.type)
      const isValidBackpageExt = validCoverExtensions.includes(backpageExt)

      if (!isValidBackpageMime && !isValidBackpageExt) {
        return new Response(JSON.stringify({
          error: 'Invalid backpage image type',
          received_type: newBackpageFile.type || 'undefined',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (newBackpageFile.length > MAX_BACKPAGE_SIZE) {
        return new Response(JSON.stringify({ error: 'Backpage image too large (max 10MB)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      let effectiveBackpageMime = newBackpageFile.type
      if (!effectiveBackpageMime || !ALLOWED_COVER_MIMES.includes(effectiveBackpageMime)) {
        effectiveBackpageMime = mimeMap[backpageExt] || 'image/jpeg'
      }

      const backpagePath = `${user.id}/backpages/${crypto.randomUUID()}.${backpageExt}`

      const { error: backpageErr } = await supabaseAdmin.storage
        .from('book-covers')
        .upload(backpagePath, newBackpageFile.content, {
          contentType: effectiveBackpageMime,
          upsert: false,
        })

      if (!backpageErr) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('book-covers')
          .getPublicUrl(backpagePath)
        new_backpage_url = publicUrl
        console.log('New backpage uploaded:', new_backpage_url)
      } else {
        console.warn('Backpage upload failed:', backpageErr.message)
      }
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    // Update metadata fields if provided
    if (f.title) updates.title = (f.title as string).trim()
    if (f.subtitle) updates.subtitle = (f.subtitle as string).trim()
    if (f.description) updates.description = (f.description as string).trim()
    if (f.content_type) updates.content_type = (f.content_type as string).trim()
    if (f.author) updates.author = (f.author as string).trim()
    if (f.publisher) updates.publisher = (f.publisher as string).trim()
    if (f.published_date) updates.published_date = (f.published_date as string)
    if (f.category_id) updates.category_id = (f.category_id as string)
    if (f.language) updates.language = (f.language as string)
    if (f.price) updates.price = parseFloat(f.price as string)
    if (f.is_free !== undefined) updates.is_free = (f.is_free as string) === 'true'
    if (f.is_for_sale !== undefined) updates.is_for_sale = (f.is_for_sale as string) === 'true'
    if (f.is_featured !== undefined) updates.is_featured = (f.is_featured as string) === 'true'
    if (f.stock_quantity) updates.stock_quantity = parseInt(f.stock_quantity as string)
    if (f.isbn) updates.isbn = (f.isbn as string).trim()
    if (f.visibility) updates.visibility = (f.visibility as string)
    if (f.access_level) updates.access_level = (f.access_level as string)
    if (f.document_number) updates.document_number = (f.document_number as string).trim()
    if (f.version) updates.version = (f.version as string)
    if (f.department) updates.department = (f.department as string).trim()
    if (f.confidentiality) updates.confidentiality = (f.confidentiality as string)
    if (f.status) updates.status = (f.status as string)
    if (f.page_count) updates.page_count = parseInt(f.page_count as string)

    // REMOVED: tags handling from updates object
    // Tags are handled separately through the content_tags junction table

    // Handle meta_keywords
    if (f.meta_keywords) {
      updates.meta_keywords = (f.meta_keywords as string)
        .split(',')
        .map(k => k.trim())
        .filter(Boolean)
    }

    // Update image URLs if replaced
    if (newCoverFile) {
      updates.cover_image_url = new_cover_url
    }

    if (newBackpageFile) {
      updates.backpage_image_url = new_backpage_url
    }

    // Set published_at if status changed to published
    if (updates.status === 'published' && existingContent.status !== 'published') {
      updates.published_at = new Date().toISOString()
    }

    console.log('Updating database with fields:', Object.keys(updates))

    // Update content
    const { data: updatedContent, error: updateError } = await supabaseAdmin
      .from('content')
      .update(updates)
      .eq('id', content_id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      
      // Translate database errors to user-friendly messages
      let userMessage = 'Failed to update content. Please try again.'
      let errorCode = updateError.code
      
      // Handle specific PostgreSQL error codes
      switch (errorCode) {
        case '23505': // Unique constraint violation
          if (updateError.message.includes('isbn')) {
            userMessage = `The ISBN "${updates.isbn}" is already in use by another content item. Please use a different ISBN.`
          } else if (updateError.message.includes('title')) {
            userMessage = 'A content item with this title already exists. Please use a different title.'
          } else {
            userMessage = 'This value is already in use. Please check your input and try again.'
          }
          break
          
        case '23514': // Check constraint violation
          if (updateError.message.includes('content_type')) {
            userMessage = 'Invalid content type selected. Please choose a valid content type.'
          } else if (updateError.message.includes('format')) {
            userMessage = 'Invalid file format. Please upload a supported file type.'
          } else if (updateError.message.includes('visibility')) {
            userMessage = 'Invalid visibility setting. Please select a valid option.'
          } else if (updateError.message.includes('status')) {
            userMessage = 'Invalid status value. Please select a valid status.'
          } else {
            userMessage = 'The provided data does not meet the required format. Please check all fields.'
          }
          break
          
        case '23503': // Foreign key violation
          if (updateError.message.includes('category_id')) {
            userMessage = 'The selected category does not exist. Please choose a valid category.'
          } else if (updateError.message.includes('organization_id')) {
            userMessage = 'The selected organization does not exist. Please contact support.'
          } else {
            userMessage = 'A required reference is missing. Please check your selections.'
          }
          break
          
        case '23502': // Not null violation
          if (updateError.message.includes('title')) {
            userMessage = 'Title is required. Please provide a title for your content.'
          } else if (updateError.message.includes('content_type')) {
            userMessage = 'Content type is required. Please select a content type.'
          } else {
            userMessage = 'A required field is missing. Please fill in all required fields.'
          }
          break
          
        case '22001': // String data too long
          userMessage = 'One or more fields exceed the maximum length. Please shorten your input.'
          break
          
        default:
          // Generic database error
          userMessage = 'Unable to update content due to a database error. Please verify your input and try again.'
      }
      
      return new Response(JSON.stringify({
        error: userMessage,
        technical_details: updateError.message,
        error_code: errorCode
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update search vector if title or description changed
    if (updates.title || updates.description) {
      console.log('Updating search vector...')
      try {
        await supabaseAdmin.rpc('update_content_search_vector', {
          content_id: content_id
        })
        console.log('Search vector updated')
      } catch (searchErr) {
        console.warn('Failed to update search vector:', searchErr)
        // Continue anyway - search update is not critical
      }
    }

    // Handle tag updates if provided (through content_tags junction table)
    if (f.tag_ids) {
      try {
        const tagIds = (f.tag_ids as string)
          .split(',')
          .map(id => id.trim())
          .filter(Boolean)

        // Delete existing tags
        await supabaseAdmin
          .from('content_tags')
          .delete()
          .eq('content_id', content_id)

        // Insert new tags
        if (tagIds.length > 0) {
          const tagInserts = tagIds.map(tag_id => ({
            content_id: content_id,
            tag_id: tag_id
          }))

          await supabaseAdmin
            .from('content_tags')
            .insert(tagInserts)
        }

        console.log('Tags updated:', tagIds.length)
      } catch (tagErr) {
        console.warn('Failed to update tags:', tagErr)
        // Continue anyway - tag update is not critical
      }
    }

    console.log('Content updated successfully:', updatedContent.id)

    return new Response(
      JSON.stringify({
        message: 'Content updated successfully',
        content: updatedContent,
        metadata: {
          cover_replaced: !!newCoverFile,
          backpage_replaced: !!newBackpageFile,
          version: updatedContent.version,
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