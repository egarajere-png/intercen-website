// supabase/functions/content-upload/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { multiParser } from 'https://deno.land/x/multiparser@0.114.0/mod.ts'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'
import { decode } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'
import { v4 as uuidv4 } from 'https://deno.land/std@0.224.0/uuid/mod.ts'

// CORS headers defined inline
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const MAX_CONTENT_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_COVER_SIZE = 10 * 1024 * 1024    // 10MB

const ALLOWED_CONTENT_MIMES = [
  'application/pdf',
  'application/epub+zip',
  'application/x-mobipocket-ebook',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const ALLOWED_COVER_MIMES = ['image/jpeg', 'image/png', 'image/webp']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Get the authorization token from the request
  const authHeader = req.headers.get('authorization')
  
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized - No authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Create an authenticated Supabase client with the user's token
  const supabaseClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          authorization: authHeader,
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('[AUTH OK] User:', user.id)

  const form = await multiParser(req)
  if (!form || !form.files || !form.fields) {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const contentFile = form.files.content_file
  const coverFile = form.files.cover_image
  const f = form.fields

  // Validation
  if (!contentFile) {
    return new Response(JSON.stringify({ error: 'content_file is required' }), { status: 400, headers: corsHeaders })
  }
  if (!f.title) {
    return new Response(JSON.stringify({ error: 'title is required' }), { status: 400, headers: corsHeaders })
  }
  if (!f.content_type) {
    return new Response(JSON.stringify({ error: 'content_type is required' }), { status: 400, headers: corsHeaders })
  }

  if (contentFile.length > MAX_CONTENT_SIZE) {
    return new Response(JSON.stringify({ error: 'Content file exceeds 100MB limit' }), { status: 400, headers: corsHeaders })
  }
  if (!ALLOWED_CONTENT_MIMES.includes(contentFile.type)) {
    return new Response(JSON.stringify({ error: 'Invalid content file type' }), { status: 400, headers: corsHeaders })
  }

  if (coverFile && coverFile.length > MAX_COVER_SIZE) {
    return new Response(JSON.stringify({ error: 'Cover image exceeds 10MB limit' }), { status: 400, headers: corsHeaders })
  }
  if (coverFile && !ALLOWED_COVER_MIMES.includes(coverFile.type)) {
    return new Response(JSON.stringify({ error: 'Invalid cover image type' }), { status: 400, headers: corsHeaders })
  }

  // Upload main content file
  const ext = contentFile.filename.split('.').pop()?.toLowerCase() || 'pdf'
  const formatMap: Record<string, string> = { pdf: 'pdf', epub: 'epub', mobi: 'mobi', docx: 'docx', txt: 'txt' }
  const format = formatMap[ext] || 'pdf'

  const contentPath = `${user.id}/${uuidv4()}.${ext}`

  const { error: contentUploadErr } = await supabaseClient.storage
    .from('book-files')
    .upload(contentPath, contentFile.content, {
      contentType: contentFile.type,
      upsert: false,
    })

  if (contentUploadErr) {
    console.error('[STORAGE] Content upload failed:', contentUploadErr)
    return new Response(JSON.stringify({ error: 'Failed to upload content file' }), { status: 500, headers: corsHeaders })
  }

  const { data: { publicUrl: file_url } } = supabaseClient.storage.from('book-files').getPublicUrl(contentPath)

  // Process cover image with ImageScript
  let cover_image_url: string | null = null
  if (coverFile) {
    try {
      const image = await decode(coverFile.content)

      const targetWidth = 800
      const targetHeight = 1200
      const scale = Math.min(targetWidth / image.width, targetHeight / image.height)
      const newWidth = Math.round(image.width * scale)
      const newHeight = Math.round(image.height * scale)

      const resized = image.resize(newWidth, newHeight)
      const encoded = await resized.encodeJPEG(85)

      const coverPath = `${user.id}/covers/${uuidv4()}.jpg`

      const { error: coverErr } = await supabaseClient.storage
        .from('book-covers')
        .upload(coverPath, encoded, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (coverErr) {
        console.warn('[STORAGE] Cover upload failed:', coverErr)
      } else {
        const { data: { publicUrl } } = supabaseClient.storage.from('book-covers').getPublicUrl(coverPath)
        cover_image_url = publicUrl
      }
    } catch (err) {
      console.warn('[IMAGE PROCESSING] Failed:', err)
    }
  }

  // Extract page count for PDFs
  let page_count: number | null = null
  if (contentFile.type === 'application/pdf') {
    try {
      const pdf = await PDFDocument.load(contentFile.content)
      page_count = pdf.getPageCount()
    } catch (e) {
      console.warn('[PDF] Page count extraction failed:', e)
    }
  }

  // Build search text
  const searchWords = [f.title, f.subtitle, f.author, f.publisher, f.description]
    .filter(Boolean)
    .join(' ')

  // Insert record
  const { data: content, error: dbError } = await supabaseClient
    .from('content')
    .insert({
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
      search_vector: searchWords ? `to_tsvector('english', '${searchWords.replace(/'/g, "''")}')` : null,
      published_at: f.status === 'published' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (dbError) {
    console.error('[DB] Insert failed:', dbError)
    return new Response(JSON.stringify({ error: 'Failed to save content', details: dbError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      message: 'Content uploaded successfully',
      content,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})