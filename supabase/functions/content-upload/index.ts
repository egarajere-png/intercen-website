// supabase/functions/content-upload/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { multiParser } from 'https://deno.land/x/multiparser@0.114.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAX_CONTENT_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_COVER_SIZE = 10 * 1024 * 1024    // 10MB
const MAX_BACKPAGE_SIZE = 10 * 1024 * 1024 // 10MB

// Comprehensive list of allowed MIME types
const ALLOWED_CONTENT_MIMES = [
  'application/pdf', 'application/epub+zip', 'application/x-mobipocket-ebook',
  'application/vnd.amazon.ebook', 'application/msword', 'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'text/plain', 'text/markdown', 'text/csv', 'text/html', 'application/xhtml+xml',
  'application/zip', 'application/x-zip-compressed',
  'image/jpeg', 'image/png', 'image/webp',
]

const ALLOWED_COVER_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_BACKPAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']

// Valid file extensions
const validContentExtensions = [
  'pdf', 'epub', 'mobi', 'azw', 'azw3', 'doc', 'docx', 'xls', 'xlsx', 
  'ppt', 'pptx', 'odt', 'ods', 'odp', 'txt', 'md', 'markdown', 'csv', 
  'html', 'htm', 'xhtml', 'zip', 'jpg', 'jpeg', 'png', 'webp'
]

const validCoverExtensions = ['jpg', 'jpeg', 'png', 'webp']
const validBackpageExtensions = ['jpg', 'jpeg', 'png', 'webp']

// Format mapping
const formatMap: Record<string, string> = {
  'pdf': 'pdf', 'doc': 'doc', 'docx': 'docx', 'txt': 'txt', 'md': 'markdown',
  'markdown': 'markdown', 'xls': 'xls', 'xlsx': 'xlsx', 'csv': 'csv',
  'ods': 'ods', 'ppt': 'ppt', 'pptx': 'pptx', 'odp': 'odp', 'epub': 'epub',
  'mobi': 'mobi', 'azw': 'azw', 'azw3': 'azw3', 'html': 'html', 'htm': 'html',
  'xhtml': 'xhtml', 'odt': 'odt', 'zip': 'zip', 'jpg': 'jpg', 'jpeg': 'jpeg',
  'png': 'png', 'webp': 'webp',
}

// MIME type fallback mapping (extension → MIME type)
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
  return 'documets' // note: likely a typo in original – should probably be 'documents'
}

Deno.serve(async (req) => {
  // Handle CORS preflight immediately - BEFORE any other logic
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    console.log('=== FUNCTION START ===')
    
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    // Parse form
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

    if (!form?.files || !form?.fields) {
      return new Response(JSON.stringify({ error: 'Invalid form data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const contentFile = form.files.content_file
    const coverFile = form.files.cover_image
    const backpageFile = form.files.backpage_image
    const f = form.fields

    const title = (f.title as string)?.trim()
    const content_type = (f.content_type as string)?.trim()

    if (!title) {
      return new Response(JSON.stringify({ error: 'title required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!content_type) {
      return new Response(JSON.stringify({ error: 'content_type required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Special validation for ebook content type
    const isEbookType = content_type.toLowerCase() === 'ebook'
    
    if (isEbookType) {
      if (!contentFile) {
        return new Response(JSON.stringify({ error: 'content_file is required for ebooks' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      if (!coverFile) {
        return new Response(JSON.stringify({ error: 'cover_image is required for ebooks' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      if (!backpageFile) {
        return new Response(JSON.stringify({ error: 'backpage_image is required for ebooks' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    console.log('Validation passed')

    // Determine format and bucket (only if content file exists)
    let format = 'unknown'
    let storageBucket = 'documets'
    let effectiveContentMime = 'application/octet-stream'
    let file_url: string | null = null
    let file_size_bytes = 0

    // Only process content file if it exists
    if (contentFile) {
      // Validate content file
      const contentExt = contentFile.filename.split('.').pop()?.toLowerCase() || ''
      const isValidContentMime = contentFile.type && ALLOWED_CONTENT_MIMES.includes(contentFile.type)
      const isValidContentExt = validContentExtensions.includes(contentExt)

      if (!isValidContentMime && !isValidContentExt) {
        return new Response(JSON.stringify({
          error: 'Invalid content file type',
          received_type: contentFile.type || 'undefined',
          received_extension: contentExt,
          allowed_extensions: validContentExtensions
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (contentFile.length > MAX_CONTENT_SIZE) {
        return new Response(JSON.stringify({
          error: 'File too large',
          size: `${(contentFile.length / 1024 / 1024).toFixed(2)}MB`,
          limit: '100MB'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      format = getFormatFromFilename(contentFile.filename)
      storageBucket = getStorageBucket(content_type, contentFile.type || '')

      // Determine effective MIME type for content file upload (fallback to extension)
      effectiveContentMime = contentFile.type
      if (!effectiveContentMime || !ALLOWED_CONTENT_MIMES.includes(effectiveContentMime)) {
        effectiveContentMime = mimeMap[contentExt] || 'application/octet-stream'
        console.log(`MIME type missing or invalid – falling back to ${effectiveContentMime} based on extension`)
      }

      // Upload content file
      const ext = contentFile.filename.split('.').pop()?.toLowerCase() || format
      const contentPath = `${user.id}/${crypto.randomUUID()}.${ext}`

      console.log('Uploading to bucket:', storageBucket, 'with MIME:', effectiveContentMime)

      const { error: uploadErr } = await supabaseAdmin.storage
        .from(storageBucket)
        .upload(contentPath, contentFile.content, {
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

      file_url = publicUrl
      file_size_bytes = contentFile.length
      console.log('File uploaded:', file_url)
    }

    // Validate cover if present
    if (coverFile) {
      const coverExt = coverFile.filename.split('.').pop()?.toLowerCase() || ''
      const isValidCoverMime = coverFile.type && ALLOWED_COVER_MIMES.includes(coverFile.type)
      const isValidCoverExt = validCoverExtensions.includes(coverExt)

      if (!isValidCoverMime && !isValidCoverExt) {
        return new Response(JSON.stringify({
          error: 'Invalid cover image type',
          received_type: coverFile.type || 'undefined',
          received_extension: coverExt,
          allowed_extensions: validCoverExtensions
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (coverFile.length > MAX_COVER_SIZE) {
        return new Response(JSON.stringify({ error: 'Cover too large' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Validate backpage if present
    if (backpageFile) {
      const backpageExt = backpageFile.filename.split('.').pop()?.toLowerCase() || ''
      const isValidBackpageMime = backpageFile.type && ALLOWED_BACKPAGE_MIMES.includes(backpageFile.type)
      const isValidBackpageExt = validBackpageExtensions.includes(backpageExt)

      if (!isValidBackpageMime && !isValidBackpageExt) {
        return new Response(JSON.stringify({
          error: 'Invalid backpage image type',
          received_type: backpageFile.type || 'undefined',
          received_extension: backpageExt,
          allowed_extensions: validBackpageExtensions
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (backpageFile.length > MAX_BACKPAGE_SIZE) {
        return new Response(JSON.stringify({ error: 'Backpage too large' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Handle cover image
    let cover_image_url: string | null = null
    if (coverFile) {
      try {
        const coverExt = coverFile.filename.split('.').pop()?.toLowerCase() || 'jpg'
        let effectiveCoverMime = coverFile.type
        if (!effectiveCoverMime || !ALLOWED_COVER_MIMES.includes(effectiveCoverMime)) {
          effectiveCoverMime = mimeMap[coverExt] || 'image/jpeg'
        }

        const coverPath = `${user.id}/covers/${crypto.randomUUID()}.${coverExt}`
        const { error: coverErr } = await supabaseAdmin.storage
          .from('book-covers')
          .upload(coverPath, coverFile.content, {
            contentType: effectiveCoverMime,
            upsert: false,
          })

        if (coverErr) {
          console.warn('Cover upload failed:', coverErr.message)
        } else {
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from('book-covers')
            .getPublicUrl(coverPath)
          cover_image_url = publicUrl
          console.log('Cover uploaded:', cover_image_url)
        }
      } catch (e) {
        console.warn('Cover upload exception:', e)
      }
    }

    // Handle backpage image
    let backpage_image_url: string | null = null
    if (backpageFile) {
      try {
        const backpageExt = backpageFile.filename.split('.').pop()?.toLowerCase() || 'jpg'
        let effectiveBackpageMime = backpageFile.type
        if (!effectiveBackpageMime || !ALLOWED_BACKPAGE_MIMES.includes(effectiveBackpageMime)) {
          effectiveBackpageMime = mimeMap[backpageExt] || 'image/jpeg'
        }

        const backpagePath = `${user.id}/backpages/${crypto.randomUUID()}.${backpageExt}`
        const { error: backpageErr } = await supabaseAdmin.storage
          .from('book-covers')  // Using same bucket as covers, but in separate folder
          .upload(backpagePath, backpageFile.content, {
            contentType: effectiveBackpageMime,
            upsert: false,
          })

        if (backpageErr) {
          console.warn('Backpage upload failed:', backpageErr.message)
        } else {
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from('book-covers')
            .getPublicUrl(backpagePath)
          backpage_image_url = publicUrl
          console.log('Backpage uploaded:', backpage_image_url)
        }
      } catch (e) {
        console.warn('Backpage upload exception:', e)
      }
    }

    // Insert database record
    const insertData = {
      title,
      subtitle: (f.subtitle as string)?.trim() || null,
      description: (f.description as string)?.trim() || null,
      content_type,
      format,
      author: (f.author as string)?.trim() || null,
      publisher: (f.publisher as string)?.trim() || null,
      published_date: (f.published_date as string) || null,
      category_id: (f.category_id as string) || null,
      language: (f.language as string) || 'en',
      cover_image_url,
      backpage_image_url,
      file_url,
      file_size_bytes,
      page_count: null,
      price: f.price ? parseFloat(f.price as string) : 0.00,
      is_free: (f.is_free as string) === 'true',
      is_for_sale: (f.is_for_sale as string) === 'true',
      stock_quantity: f.stock_quantity ? parseInt(f.stock_quantity as string) : 0,
      isbn: (f.isbn as string)?.trim() || null,
      visibility: (f.visibility as string) || 'private',
      access_level: (f.access_level as string) || 'free',
      document_number: (f.document_number as string)?.trim() || null,
      version: (f.version as string) || '1.0',
      department: (f.department as string)?.trim() || null,
      confidentiality: (f.confidentiality as string) || null,
      status: (f.status as string) || 'draft',
      uploaded_by: user.id,
      organization_id: (f.organization_id as string) || null,
      meta_keywords: f.meta_keywords ? (f.meta_keywords as string).split(',').map(k => k.trim()) : null,
      published_at: (f.status as string) === 'published' ? new Date().toISOString() : null,
    }

    console.log('Inserting to database')

    const { data: content, error: dbError } = await supabaseAdmin
      .from('content')
      .insert(insertData)
      .select()
      .single()

    if (dbError) {
      console.error('DB error:', dbError)
      return new Response(JSON.stringify({
        error: 'Database insert failed',
        details: dbError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Success! Content ID:', content.id)

    return new Response(
      JSON.stringify({
        message: 'Content uploaded successfully',
        content,
        metadata: {
          bucket: storageBucket,
          format,
          file_size: contentFile ? `${(contentFile.length / 1024 / 1024).toFixed(2)}MB` : 'N/A',
          has_content_file: !!file_url,
          has_cover: !!cover_image_url,
          has_backpage: !!backpage_image_url,
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