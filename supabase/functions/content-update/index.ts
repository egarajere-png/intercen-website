// supabase/functions/content-update/index.ts
import { createClient } from '@supabase/supabase-js';
import { multiParser } from 'https://deno.land/x/multiparser@0.114.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAX_CONTENT_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_COVER_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_CONTENT_MIMES = [
  'application/pdf',
  'application/epub+zip',
  'application/x-mobipocket-ebook',
  'application/vnd.amazon.ebook',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'application/xhtml+xml',
  'application/zip',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const ALLOWED_COVER_MIMES = ['image/jpeg', 'image/png', 'image/webp']

const validContentExtensions = [
  'pdf', 'epub', 'mobi', 'azw', 'azw3', 'doc', 'docx', 'xls', 'xlsx',
  'ppt', 'pptx', 'odt', 'ods', 'odp', 'txt', 'md', 'markdown', 'csv',
  'html', 'htm', 'xhtml', 'zip', 'jpg', 'jpeg', 'png', 'webp'
]

const validCoverExtensions = ['jpg', 'jpeg', 'png', 'webp']

const formatMap: Record<string, string> = {
  'pdf': 'pdf', 'doc': 'doc', 'docx': 'docx', 'txt': 'txt',
  'md': 'markdown', 'markdown': 'markdown', 'xls': 'xls', 'xlsx': 'xlsx',
  'csv': 'csv', 'ods': 'ods', 'ppt': 'ppt', 'pptx': 'pptx', 'odp': 'odp',
  'epub': 'epub', 'mobi': 'mobi', 'azw': 'azw', 'azw3': 'azw3',
  'html': 'html', 'htm': 'html', 'xhtml': 'xhtml', 'odt': 'odt',
  'zip': 'zip', 'jpg': 'jpg', 'jpeg': 'jpeg', 'png': 'png', 'webp': 'webp',
}

const mimeMap: Record<string, string> = {
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  mobi: 'application/x-mobipocket-ebook',
  azw: 'application/vnd.amazon.ebook',
  azw3: 'application/vnd.amazon.ebook',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  csv: 'text/csv',
  html: 'text/html',
  htm: 'text/html',
  xhtml: 'application/xhtml+xml',
  zip: 'application/zip',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const getFormatFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return formatMap[ext] || ext || 'unknown'
}

const getStorageBucket = (contentType: string, mimeType: string): string => {
  if (['book', 'ebook'].includes(contentType.toLowerCase())) return 'book-files'
  if (mimeType.startsWith('image/')) return 'manuscripts'
  if (contentType.toLowerCase().includes('manuscript')) return 'manuscripts'
  return 'documets'
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

    // Handle file replacement if new file provided
    const newContentFile = form.files?.content_file
    const newCoverFile = form.files?.cover_image
    let new_file_url = existingContent.file_url
    let new_cover_url = existingContent.cover_image_url
    let new_format = existingContent.format
    let new_file_size = existingContent.file_size_bytes

    if (newContentFile) {
      console.log('New content file detected, validating...')

      const contentExt = newContentFile.filename.split('.').pop()?.toLowerCase() || ''
      const isValidContentMime = newContentFile.type && ALLOWED_CONTENT_MIMES.includes(newContentFile.type)
      const isValidContentExt = validContentExtensions.includes(contentExt)

      if (!isValidContentMime && !isValidContentExt) {
        return new Response(JSON.stringify({
          error: 'Invalid content file type',
          received_type: newContentFile.type || 'undefined',
          received_extension: contentExt,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (newContentFile.length > MAX_CONTENT_SIZE) {
        return new Response(JSON.stringify({
          error: 'File too large',
          size: `${(newContentFile.length / 1024 / 1024).toFixed(2)}MB`,
          limit: '100MB'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Determine bucket and MIME type
      const content_type = (f.content_type as string)?.trim() || existingContent.content_type
      new_format = getFormatFromFilename(newContentFile.filename)
      const storageBucket = getStorageBucket(content_type, newContentFile.type || '')

      let effectiveContentMime = newContentFile.type
      if (!effectiveContentMime || !ALLOWED_CONTENT_MIMES.includes(effectiveContentMime)) {
        effectiveContentMime = mimeMap[contentExt] || 'application/octet-stream'
      }

      // Upload new file
      const ext = contentExt || new_format
      const contentPath = `${user.id}/${crypto.randomUUID()}.${ext}`

      console.log('Uploading new file to bucket:', storageBucket)

      const { error: uploadErr } = await supabaseAdmin.storage
        .from(storageBucket)
        .upload(contentPath, newContentFile.content, {
          contentType: effectiveContentMime,
          upsert: false,
        })

      if (uploadErr) {
        console.error('Upload error:', uploadErr)
        return new Response(JSON.stringify({
          error: 'Upload failed',
          details: uploadErr.message,
          bucket: storageBucket
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(storageBucket)
        .getPublicUrl(contentPath)

      new_file_url = publicUrl
      new_file_size = newContentFile.length

      console.log('New file uploaded:', new_file_url)

      // Create version history entry
      try {
        const currentVersion = parseFloat(existingContent.version || '1.0')
        const newVersion = (currentVersion + 0.1).toFixed(1)

        await supabaseAdmin
          .from('content_version_history')
          .insert({
            content_id: content_id,
            version_number: existingContent.version || '1.0',
            file_url: existingContent.file_url,
            file_size_bytes: existingContent.file_size_bytes,
            format: existingContent.format,
            changed_by: user.id,
            change_summary: 'File replacement',
          })

        console.log('Version history created for version:', existingContent.version)
      } catch (versionErr) {
        console.warn('Failed to create version history:', versionErr)
        // Continue anyway - version history is nice to have but not critical
      }
    }

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
        return new Response(JSON.stringify({ error: 'Cover too large' }), {
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

    // Handle meta_keywords
    if (f.meta_keywords) {
      updates.meta_keywords = (f.meta_keywords as string)
        .split(',')
        .map(k => k.trim())
        .filter(Boolean)
    }

    // Update file-related fields if file was replaced
    if (newContentFile) {
      updates.file_url = new_file_url
      updates.file_size_bytes = new_file_size
      updates.format = new_format
    }

    if (newCoverFile) {
      updates.cover_image_url = new_cover_url
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
      return new Response(JSON.stringify({
        error: 'Failed to update content',
        details: updateError.message
      }), {
        status: 500,
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

    // Handle tag updates if provided
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
      }
    }

    console.log('Content updated successfully:', updatedContent.id)

    return new Response(
      JSON.stringify({
        message: 'Content updated successfully',
        content: updatedContent,
        metadata: {
          file_replaced: !!newContentFile,
          cover_replaced: !!newCoverFile,
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