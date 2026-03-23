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

const MAX_COVER_SIZE = 10 * 1024 * 1024
const MAX_BACKPAGE_SIZE = 10 * 1024 * 1024

const ALLOWED_COVER_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_BACKPAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']

const validCoverExtensions = ['jpg', 'jpeg', 'png', 'webp']
const validBackpageExtensions = ['jpg', 'jpeg', 'png', 'webp']

const mimeMap: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

Deno.serve(async (req) => {
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

    const coverFile = form.files?.cover_image
    const backpageFile = form.files?.backpage_image
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

    const isEbookType = content_type.toLowerCase() === 'ebook'
    
    if (isEbookType) {
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
        return new Response(JSON.stringify({ error: 'Cover too large (max 10MB)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

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
        return new Response(JSON.stringify({ error: 'Backpage too large (max 10MB)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

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
          .from('book-covers')
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

    const insertData = {
      title,
      subtitle: (f.subtitle as string)?.trim() || null,
      description: (f.description as string)?.trim() || null,
      content_type,
      format: null,
      author: (f.author as string)?.trim() || null,
      publisher: (f.publisher as string)?.trim() || null,
      published_date: (f.published_date as string) || null,
      category_id: (f.category_id as string) || null,
      language: (f.language as string) || 'en',
      cover_image_url,
      backpage_image_url,
      file_url: null,
      file_size_bytes: 0,
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
      
      let userMessage = 'Failed to save content. Please try again.'
      const errorCode = dbError.code
      
      switch (errorCode) {
        case '23505':
          if (dbError.message.includes('isbn')) {
            userMessage = `The ISBN "${insertData.isbn}" is already in use. Please use a different ISBN or leave it empty.`
          } else if (dbError.message.includes('title')) {
            userMessage = 'A content item with this title already exists. Please use a different title.'
          } else {
            userMessage = 'This content already exists in the system. Please check your input and try again.'
          }
          break
          
        case '23514':
          if (dbError.message.includes('content_type')) {
            userMessage = 'Invalid content type selected. Please choose a valid content type.'
          } else if (dbError.message.includes('format')) {
            userMessage = 'Invalid file format. Please upload a supported file type.'
          } else if (dbError.message.includes('visibility')) {
            userMessage = 'Invalid visibility setting. Please select a valid option.'
          } else if (dbError.message.includes('status')) {
            userMessage = 'Invalid status value. Please select a valid status.'
          } else {
            userMessage = 'The provided data does not meet the required format. Please check all fields.'
          }
          break
          
        case '23503':
          if (dbError.message.includes('category_id')) {
            userMessage = 'The selected category does not exist. Please choose a valid category.'
          } else if (dbError.message.includes('organization_id')) {
            userMessage = 'The selected organization does not exist. Please contact support.'
          } else {
            userMessage = 'A required reference is missing. Please check your selections.'
          }
          break
          
        case '23502':
          if (dbError.message.includes('title')) {
            userMessage = 'Title is required. Please provide a title for your content.'
          } else if (dbError.message.includes('content_type')) {
            userMessage = 'Content type is required. Please select a content type.'
          } else {
            userMessage = 'A required field is missing. Please fill in all required fields.'
          }
          break
          
        case '22001':
          userMessage = 'One or more fields exceed the maximum length. Please shorten your input.'
          break
          
        default:
          userMessage = 'Unable to save content due to a database error. Please verify your input and try again.'
      }
      
      return new Response(JSON.stringify({
        error: userMessage,
        technical_details: dbError.message,
        error_code: errorCode
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Success! Content ID:', content.id)

    return new Response(
      JSON.stringify({
        message: 'Content uploaded successfully',
        content,
        metadata: {
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