// supabase/functions/content-upload/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { multiParser } from 'https://deno.land/x/multiparser@0.114.0/mod.ts'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'
import { decode } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'
import { v4 as uuidv4 } from 'https://deno.land/std@0.224.0/uuid/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAX_CONTENT_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_COVER_SIZE = 10 * 1024 * 1024    // 10MB

// Comprehensive list of allowed MIME types aligned with storage buckets
const ALLOWED_CONTENT_MIMES = [
  // PDF
  'application/pdf',
  
  // eBook formats
  'application/epub+zip',
  'application/x-mobipocket-ebook',
  'application/vnd.amazon.ebook',
  
  // Microsoft Office (Legacy)
  'application/msword', // .doc
  'application/vnd.ms-excel', // .xls
  'application/vnd.ms-powerpoint', // .ppt
  
  // Microsoft Office (Modern)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  
  // OpenDocument formats
  'application/vnd.oasis.opendocument.text', // .odt
  'application/vnd.oasis.opendocument.spreadsheet', // .ods
  'application/vnd.oasis.opendocument.presentation', // .odp
  
  // Text formats
  'text/plain', // .txt
  'text/markdown', // .md
  'text/csv', // .csv
  'text/html', // .html
  'application/xhtml+xml', // .xhtml
  
  // Archive formats
  'application/zip',
  'application/x-zip-compressed',
  
  // Image formats (for image-based documents)
  'image/jpeg',
  'image/png',
  'image/webp',
]

const ALLOWED_COVER_MIMES = ['image/jpeg', 'image/png', 'image/webp']

// Enhanced file extension to format mapping
const getFormatFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  
  const formatMap: Record<string, string> = {
    // Documents
    'pdf': 'pdf',
    'doc': 'doc',
    'docx': 'docx',
    'txt': 'txt',
    'md': 'markdown',
    'markdown': 'markdown',
    
    // Spreadsheets
    'xls': 'xls',
    'xlsx': 'xlsx',
    'csv': 'csv',
    'ods': 'ods',
    
    // Presentations
    'ppt': 'ppt',
    'pptx': 'pptx',
    'odp': 'odp',
    
    // eBooks
    'epub': 'epub',
    'mobi': 'mobi',
    'azw': 'azw',
    'azw3': 'azw3',
    
    // Web
    'html': 'html',
    'htm': 'html',
    'xhtml': 'xhtml',
    
    // OpenDocument
    'odt': 'odt',
    
    // Archives
    'zip': 'zip',
    
    // Images
    'jpg': 'jpg',
    'jpeg': 'jpeg',
    'png': 'png',
    'webp': 'webp',
  }
  
  return formatMap[ext] || ext || 'unknown'
}

// Get appropriate storage bucket based on content type
const getStorageBucket = (contentType: string, mimeType: string): string => {
  // Manuscripts for book/ebook content
  if (['book', 'ebook'].includes(contentType.toLowerCase())) {
    return 'book-files'
  }
  
  // Check if it's an image
  if (mimeType.startsWith('image/')) {
    return 'manuscripts' // or create an 'images' bucket if needed
  }
  
  // Check if it's specifically a manuscript submission
  if (contentType.toLowerCase().includes('manuscript')) {
    return 'manuscripts'
  }
  
  // Default to documents for everything else
  return 'documets' // Note: Keep the typo as it matches your bucket name
}

Deno.serve(async (req) => {
  console.log('=== REQUEST START ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers')
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method)
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('=== REQUEST HEADERS ===')
  const authHeader = req.headers.get('authorization')
  console.log('Auth header present:', !!authHeader)
  
  if (!authHeader) {
    console.error('ERROR: No authorization header found')
    return new Response(JSON.stringify({ error: 'Unauthorized - No authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.replace('Bearer ', '')

  console.log('Creating Supabase admin client...')
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('Verifying user token...')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    console.error('ERROR: Auth error:', authError?.message)
    return new Response(JSON.stringify({ 
      error: 'Invalid or expired token', 
      details: authError?.message 
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('[AUTH OK] User ID:', user.id)

  console.log('=== PARSING FORM DATA ===')
  let form
  try {
    form = await multiParser(req)
    console.log('Form parsed successfully')
    console.log('Files present:', form?.files ? Object.keys(form.files) : 'none')
  } catch (parseError) {
    console.error('ERROR: Failed to parse form:', parseError)
    return new Response(JSON.stringify({ 
      error: 'Failed to parse form data', 
      details: parseError.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!form || !form.files || !form.fields) {
    console.error('ERROR: Invalid form structure')
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const contentFile = form.files.content_file
  const coverFile = form.files.cover_image
  const f = form.fields

  console.log('=== FORM VALIDATION ===')
  console.log('Content file present:', !!contentFile)
  if (contentFile) {
    console.log('Content file name:', contentFile.filename)
    console.log('Content file type:', contentFile.type)
    console.log('Content file size:', contentFile.length, 'bytes')
  }

  if (!contentFile) {
    console.error('ERROR: No content file')
    return new Response(JSON.stringify({ error: 'content_file is required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  if (!f.title) {
    console.error('ERROR: No title')
    return new Response(JSON.stringify({ error: 'title is required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  if (!f.content_type) {
    console.error('ERROR: No content_type')
    return new Response(JSON.stringify({ error: 'content_type is required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (contentFile.length > MAX_CONTENT_SIZE) {
    console.error('ERROR: Content file too large:', contentFile.length)
    return new Response(JSON.stringify({ 
      error: `Content file exceeds ${MAX_CONTENT_SIZE / 1024 / 1024}MB limit`,
      actual_size: `${(contentFile.length / 1024 / 1024).toFixed(2)}MB`
    }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Validate MIME type - with fallback to file extension validation
  const isValidMime = ALLOWED_CONTENT_MIMES.includes(contentFile.type)
  const fileExt = contentFile.filename.split('.').pop()?.toLowerCase() || ''
  
  // Common extensions that should be accepted
  const validExtensions = [
    'pdf', 'epub', 'mobi', 'azw', 'azw3',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'odt', 'ods', 'odp',
    'txt', 'md', 'markdown', 'csv', 'html', 'htm', 'xhtml',
    'zip', 'jpg', 'jpeg', 'png', 'webp'
  ]
  
  const isValidExtension = validExtensions.includes(fileExt)
  
  if (!isValidMime && !isValidExtension) {
    console.error('ERROR: Invalid content type:', contentFile.type)
    console.error('ERROR: Invalid extension:', fileExt)
    console.error('Allowed types:', ALLOWED_CONTENT_MIMES)
    return new Response(JSON.stringify({ 
      error: 'Invalid content file type',
      received_type: contentFile.type,
      received_extension: fileExt,
      filename: contentFile.filename,
      allowed_types: ALLOWED_CONTENT_MIMES,
      allowed_extensions: validExtensions,
      hint: 'The file type or extension is not supported. Please use a supported document format.'
    }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Log warning if MIME type doesn't match but extension is valid
  if (!isValidMime && isValidExtension) {
    console.warn('WARNING: MIME type not in allowed list, but extension is valid')
    console.warn('Received MIME:', contentFile.type, '- Extension:', fileExt)
    console.warn('Proceeding with upload based on file extension')
  }

  if (coverFile) {
    if (coverFile.length > MAX_COVER_SIZE) {
      console.error('ERROR: Cover file too large:', coverFile.length)
      return new Response(JSON.stringify({ 
        error: 'Cover image exceeds 10MB limit',
        actual_size: `${(coverFile.length / 1024 / 1024).toFixed(2)}MB`
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Validate cover image with MIME type and extension fallback
    const isValidCoverMime = ALLOWED_COVER_MIMES.includes(coverFile.type)
    const coverExt = coverFile.filename.split('.').pop()?.toLowerCase() || ''
    const validCoverExtensions = ['jpg', 'jpeg', 'png', 'webp']
    const isValidCoverExtension = validCoverExtensions.includes(coverExt)
    
    if (!isValidCoverMime && !isValidCoverExtension) {
      console.error('ERROR: Invalid cover type:', coverFile.type)
      console.error('ERROR: Invalid cover extension:', coverExt)
      return new Response(JSON.stringify({ 
        error: 'Invalid cover image type',
        received_type: coverFile.type,
        received_extension: coverExt,
        filename: coverFile.filename,
        allowed_types: ALLOWED_COVER_MIMES,
        allowed_extensions: validCoverExtensions,
        hint: 'Cover image must be JPEG, PNG, or WebP format'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Log warning if MIME type doesn't match but extension is valid
    if (!isValidCoverMime && isValidCoverExtension) {
      console.warn('WARNING: Cover MIME type not in allowed list, but extension is valid')
      console.warn('Received MIME:', coverFile.type, '- Extension:', coverExt)
      console.warn('Proceeding with cover upload based on file extension')
    }
  }

  console.log('Validation passed ✓')

  // Determine format and storage bucket
  const format = getFormatFromFilename(contentFile.filename)
  const storageBucket = getStorageBucket(f.content_type as string, contentFile.type)
  
  console.log('Detected format:', format)
  console.log('Target bucket:', storageBucket)

  // Upload main content file
  console.log('=== UPLOADING CONTENT FILE ===')
  const ext = contentFile.filename.split('.').pop()?.toLowerCase() || format
  const contentPath = `${user.id}/${uuidv4()}.${ext}`
  console.log('Content path:', contentPath)

  const { error: contentUploadErr } = await supabaseAdmin.storage
    .from(storageBucket)
    .upload(contentPath, contentFile.content, {
      contentType: contentFile.type,
      upsert: false,
    })

  if (contentUploadErr) {
    console.error('[STORAGE] Content upload failed:', contentUploadErr)
    return new Response(JSON.stringify({ 
      error: 'Failed to upload content file', 
      details: contentUploadErr.message,
      bucket: storageBucket
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  console.log('Content file uploaded successfully ✓')
  const { data: { publicUrl: file_url } } = supabaseAdmin.storage
    .from(storageBucket)
    .getPublicUrl(contentPath)
  console.log('File URL:', file_url)

  // Process cover image
  console.log('=== PROCESSING COVER IMAGE ===')
  let cover_image_url: string | null = null
  if (coverFile) {
    try {
      console.log('Decoding image...')
      const image = await decode(coverFile.content)
      console.log('Original dimensions:', image.width, 'x', image.height)

      const targetWidth = 800
      const targetHeight = 1200
      const scale = Math.min(targetWidth / image.width, targetHeight / image.height)
      const newWidth = Math.round(image.width * scale)
      const newHeight = Math.round(image.height * scale)

      console.log('Resizing to:', newWidth, 'x', newHeight)
      const resized = image.resize(newWidth, newHeight)
      
      console.log('Encoding as JPEG...')
      const encoded = await resized.encodeJPEG(85)
      console.log('Encoded size:', encoded.length, 'bytes')

      const coverPath = `${user.id}/covers/${uuidv4()}.jpg`
      console.log('Cover path:', coverPath)

      const { error: coverErr } = await supabaseAdmin.storage
        .from('book-covers')
        .upload(coverPath, encoded, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (coverErr) {
        console.warn('[STORAGE] Cover upload failed:', coverErr)
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('book-covers')
          .getPublicUrl(coverPath)
        cover_image_url = publicUrl
        console.log('Cover uploaded successfully ✓')
        console.log('Cover URL:', cover_image_url)
      }
    } catch (err) {
      console.warn('[IMAGE PROCESSING] Failed:', err)
    }
  } else {
    console.log('No cover image provided')
  }

  // Extract page count for PDFs
  console.log('=== EXTRACTING METADATA ===')
  let page_count: number | null = null
  if (contentFile.type === 'application/pdf') {
    try {
      console.log('Loading PDF to extract page count...')
      const pdf = await PDFDocument.load(contentFile.content)
      page_count = pdf.getPageCount()
      console.log('Page count:', page_count)
    } catch (e) {
      console.warn('[PDF] Page count extraction failed:', e)
    }
  }

  // Build search text
  const searchWords = [f.title, f.subtitle, f.author, f.publisher, f.description]
    .filter(Boolean)
    .join(' ')
  console.log('Search text length:', searchWords.length, 'characters')

  // Insert record
  console.log('=== INSERTING DATABASE RECORD ===')
  const insertData = {
    title: f.title.trim(),
    subtitle: f.subtitle?.trim() || null,
    description: f.description?.trim() || null,
    content_type: f.content_type,
    format,
    author: f.author?.trim() || null,
    publisher: f.publisher?.trim() || null,
    published_date: f.published_date || null,
    category_id: f.category_id || null,
    language: f.language || 'en',
    cover_image_url,
    file_url,
    file_size_bytes: contentFile.length,
    page_count,
    price: f.price ? parseFloat(f.price as string) : 0.00,
    is_free: f.is_free === 'true',
    is_for_sale: f.is_for_sale === 'true',
    stock_quantity: f.stock_quantity ? parseInt(f.stock_quantity as string) : 0,
    isbn: f.isbn?.trim() || null,
    visibility: f.visibility || 'private',
    access_level: f.access_level || 'free',
    document_number: f.document_number?.trim() || null,
    version: f.version || '1.0',
    department: f.department?.trim() || null,
    confidentiality: f.confidentiality || null,
    status: f.status || 'draft',
    uploaded_by: user.id,
    organization_id: f.organization_id || null,
    meta_keywords: f.meta_keywords ? (f.meta_keywords as string).split(',').map(k => k.trim()) : null,
    published_at: f.status === 'published' ? new Date().toISOString() : null,
  }

  console.log('Inserting into database...')

  const { data: content, error: dbError } = await supabaseAdmin
    .from('content')
    .insert(insertData)
    .select()
    .single()

  if (dbError) {
    console.error('[DB] Insert failed:', dbError)
    return new Response(JSON.stringify({ 
      error: 'Failed to save content', 
      details: dbError.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('[DB] Record inserted successfully ✓')
  console.log('[DB] Content ID:', content.id)
  console.log('=== REQUEST COMPLETE ===')

  return new Response(
    JSON.stringify({
      message: 'Content uploaded successfully',
      content,
      metadata: {
        bucket: storageBucket,
        format,
        file_size: `${(contentFile.length / 1024 / 1024).toFixed(2)}MB`,
      }
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})