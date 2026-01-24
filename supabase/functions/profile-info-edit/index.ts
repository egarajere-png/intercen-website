// supabase/functions/profile-info-edit/index.ts

// ────────────────────────────────────────────────
// CORS Configuration (inline to avoid import issues)
// ────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

import { createClient } from 'jsr:@supabase/supabase-js@2'

// ────────────────────────────────────────────────
// Constants matching frontend
// ────────────────────────────────────────────────
const MAX_NAME = 100
const MAX_BIO = 500
const MAX_PHONE = 20
const MAX_ADDRESS = 500
const MAX_ORGANIZATION = 255
const MAX_DEPARTMENT = 255
const MAX_AVATAR_MB = 5
const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024

const VALID_ACCOUNT_TYPES = ['personal', 'corporate', 'institutional']
const VALID_IMAGE_FORMATS = ['png', 'jpeg', 'jpg', 'gif', 'webp']

// ────────────────────────────────────────────────
// Utility Functions
// ────────────────────────────────────────────────

function sanitize(input: string | undefined | null): string {
  if (!input) return ''
  return input
    .replace(/[^\p{L}\p{N}\s\-',.()@&]/gu, '')
    .trim()
}

function validateBase64Image(base64: string): { valid: boolean; error?: string } {
  if (!base64 || base64.trim() === '') {
    return { valid: false, error: 'No image data provided' }
  }

  // Check for valid data URI prefix
  const prefixRegex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i
  if (!prefixRegex.test(base64)) {
    return { 
      valid: false, 
      error: 'Invalid image format. Only PNG, JPEG, GIF, and WebP are supported.' 
    }
  }

  // Extract base64 data
  const base64Data = base64.split(',')[1]
  if (!base64Data || base64Data.trim() === '') {
    return { valid: false, error: 'Empty or missing base64 image content' }
  }

  // Validate base64 characters
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/
  if (!base64Regex.test(base64Data)) {
    return { valid: false, error: 'Invalid base64 encoding' }
  }

  // Calculate file size
  const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0
  const sizeInBytes = Math.floor((base64Data.length * 3) / 4) - padding

  // Size validation
  if (sizeInBytes > MAX_AVATAR_BYTES) {
    return { 
      valid: false, 
      error: `Image too large. Maximum size is ${MAX_AVATAR_MB}MB.` 
    }
  }

  if (sizeInBytes < 100) {
    return { valid: false, error: 'Image data too small to be a valid image' }
  }

  return { valid: true }
}

function safeBase64Decode(base64: string): Uint8Array | null {
  try {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  } catch (err) {
    console.error('[BASE64_DECODE_ERROR]', err instanceof Error ? err.message : String(err))
    return null
  }
}

// ────────────────────────────────────────────────
// Main Handler
// ────────────────────────────────────────────────

Deno.serve(async (req) => {
  // ────────────────────────────────────────────────
  // CORS Preflight - Handle FIRST before anything else
  // ────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    console.log('[OPTIONS] CORS preflight handled')
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  const method = req.method
  const url = new URL(req.url)
  const userAgent = req.headers.get('user-agent') || 'unknown'

  console.log(`[${new Date().toISOString()}] ${method} ${url.pathname} - ${userAgent}`)

  // ────────────────────────────────────────────────
  // Method Validation
  // ────────────────────────────────────────────────
  if (method !== 'POST') {
    console.log(`[METHOD_NOT_ALLOWED] ${method}`)
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }), 
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // ────────────────────────────────────────────────
    // Environment Configuration
    // ────────────────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('[CONFIG] Supabase URL:', supabaseUrl ? 'present' : 'MISSING')
    console.log('[CONFIG] Service Role Key:', supabaseServiceRoleKey ? `present (${supabaseServiceRoleKey.substring(0, 20)}...)` : 'MISSING')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[CONFIG_ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ────────────────────────────────────────────────
    // Authentication
    // ────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization') || ''
    console.log('[AUTH_HEADER] Raw:', authHeader ? `present (${authHeader.substring(0, 30)}...)` : 'MISSING')
    
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    console.log('[AUTH_TOKEN] Extracted:', token ? `present (length: ${token.length}, prefix: ${token.substring(0, 20)}...)` : 'MISSING')

    if (!token) {
      console.log('[AUTH_ERROR] No token provided')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token provided' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create admin client with service role key for user verification
    console.log('[SUPABASE_CLIENT] Creating admin client with service role key...')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Verify user authentication using the JWT token
    console.log('[AUTH] Verifying user with getUser()...')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError) {
      console.error('[AUTH_ERROR] getUser failed:', {
        message: userError.message,
        status: userError.status,
        name: userError.name,
      })
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token. Please sign in again.' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!user) {
      console.error('[AUTH_ERROR] No user returned from getUser()')
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token. Please sign in again.' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`[AUTH_SUCCESS] User authenticated: ${user.id} | Email: ${user.email}`)

    // ────────────────────────────────────────────────
    // Parse Request Body
    // ────────────────────────────────────────────────
    let body: any
    try {
      body = await req.json()
      console.log('[BODY_PARSED] Fields:', Object.keys(body).join(', '))
    } catch (err) {
      console.error('[JSON_PARSE_ERROR]', err instanceof Error ? err.message : String(err))
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ────────────────────────────────────────────────
    // Build Update Fields
    // ────────────────────────────────────────────────
    const updateFields: Record<string, any> = { id: user.id }

    // Full Name
    if ('full_name' in body) {
      const fullName = sanitize(body.full_name).slice(0, MAX_NAME)
      if (fullName) {
        updateFields.full_name = fullName
      }
    }

    // Bio
    if ('bio' in body) {
      const bio = sanitize(body.bio || '').slice(0, MAX_BIO)
      updateFields.bio = bio || null
    }

    // Phone
    if ('phone' in body) {
      const phone = sanitize(body.phone || '').slice(0, MAX_PHONE)
      updateFields.phone = phone || null
    }

    // Address
    if ('address' in body) {
      const address = sanitize(body.address || '').slice(0, MAX_ADDRESS)
      updateFields.address = address || null
    }

    // Organization
    if ('organization' in body) {
      const organization = sanitize(body.organization || '').slice(0, MAX_ORGANIZATION)
      updateFields.organization = organization || null
    }

    // Department
    if ('department' in body) {
      const department = sanitize(body.department || '').slice(0, MAX_DEPARTMENT)
      updateFields.department = department || null
    }

    // Account Type
    if ('account_type' in body) {
      const accountType = body.account_type
      if (VALID_ACCOUNT_TYPES.includes(accountType)) {
        updateFields.account_type = accountType
      } else {
        console.warn(`[VALIDATION_WARNING] Invalid account_type: ${accountType}`)
      }
    }

    console.log('[UPDATE_FIELDS]', Object.keys(updateFields).filter(k => k !== 'id').join(', '))

    // ────────────────────────────────────────────────
    // Avatar Upload Handling
    // ────────────────────────────────────────────────
    const avatarBase64 = body.avatar_base64

    if (avatarBase64) {
      console.log('[AVATAR] Processing avatar upload...')

      // Validate base64 image
      const validation = validateBase64Image(avatarBase64)
      if (!validation.valid) {
        console.log('[AVATAR_VALIDATION_FAILED]', validation.error)
        return new Response(
          JSON.stringify({ error: validation.error }), 
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Extract MIME type and extension
      const mimeMatch = avatarBase64.match(/^data:image\/(\w+);base64,/i)
      if (!mimeMatch) {
        return new Response(
          JSON.stringify({ error: 'Invalid image data URI format' }), 
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      const extRaw = mimeMatch[1].toLowerCase()
      const ext = extRaw === 'jpg' ? 'jpeg' : extRaw
      
      if (!VALID_IMAGE_FORMATS.includes(ext)) {
        return new Response(
          JSON.stringify({ error: `Unsupported image format: ${ext}` }), 
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      const contentType = `image/${ext}`

      // Decode base64 to binary
      const base64Data = avatarBase64.split(',')[1]
      const fileData = safeBase64Decode(base64Data)
      
      if (!fileData) {
        return new Response(
          JSON.stringify({ error: 'Failed to decode base64 image data' }), 
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      console.log(`[AVATAR] Decoded successfully - Size: ${fileData.length} bytes | Type: ${contentType}`)

      // Generate unique filename
      const userPrefix = user.id.slice(0, 8)
      const uniqueId = crypto.randomUUID()
      const fileName = `${userPrefix}/${uniqueId}.${ext}`

      // Upload to Supabase Storage (using admin client)
      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(fileName, fileData, {
          contentType,
          upsert: true,
          cacheControl: 'public, max-age=31536000',
        })

      if (uploadError) {
        console.error('[STORAGE_UPLOAD_ERROR]', uploadError.message)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to upload avatar image', 
            details: uploadError.message 
          }), 
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(fileName)

      updateFields.avatar_url = urlData.publicUrl
      console.log(`[STORAGE_SUCCESS] Avatar uploaded: ${urlData.publicUrl}`)

      // ────────────────────────────────────────────────
      // Clean up old avatar (best effort)
      // ────────────────────────────────────────────────
      try {
        const { data: currentProfile } = await supabaseAdmin
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        if (currentProfile?.avatar_url) {
          // Extract file path from URL
          const oldUrl = new URL(currentProfile.avatar_url)
          const oldPath = oldUrl.pathname
            .replace(/^\/storage\/v1\/object\/public\/avatars\//, '')
            .replace(/^avatars\//, '')

          // Only delete if it's different from the new file
          if (oldPath && oldPath !== fileName) {
            console.log(`[CLEANUP] Attempting to delete old avatar: ${oldPath}`)
            
            const { error: deleteError } = await supabaseAdmin.storage
              .from('avatars')
              .remove([oldPath])

            if (deleteError) {
              console.warn('[CLEANUP_WARNING] Failed to delete old avatar:', deleteError.message)
            } else {
              console.log('[CLEANUP_SUCCESS] Old avatar deleted')
            }
          }
        }
      } catch (cleanupError) {
        // Non-fatal - log and continue
        console.warn('[CLEANUP_ERROR] (non-fatal):', cleanupError)
      }
    }

    // ────────────────────────────────────────────────
    // Validate Update
    // ────────────────────────────────────────────────
    if (Object.keys(updateFields).length <= 1) {
      console.log('[NO_CHANGES] Only id field present')
      return new Response(
        JSON.stringify({ error: 'No fields to update' }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ────────────────────────────────────────────────
    // Update Profile in Database
    // ────────────────────────────────────────────────
    console.log('[DATABASE] Upserting profile...')
    
    const { data: updatedProfile, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(updateFields, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (upsertError) {
      console.error('[DATABASE_ERROR]', {
        message: upsertError.message,
        code: upsertError.code,
        details: upsertError.details,
      })
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update profile', 
          details: upsertError.message 
        }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!updatedProfile) {
      console.error('[DATABASE_ERROR] Upsert returned no data')
      return new Response(
        JSON.stringify({ error: 'Profile update succeeded but no data returned' }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[SUCCESS] Profile updated successfully')

    // ────────────────────────────────────────────────
    // Sync full_name to Auth Metadata (optional)
    // ────────────────────────────────────────────────
    if (updateFields.full_name) {
      supabaseAdmin.auth
        .updateUser({ data: { full_name: updateFields.full_name } })
        .catch((syncError) => {
          console.warn('[AUTH_SYNC_WARNING]', syncError.message)
        })
    }

    // ────────────────────────────────────────────────
    // Return Success Response
    // ────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ 
        message: 'Profile updated successfully', 
        profile: updatedProfile 
      }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (err) {
    // ────────────────────────────────────────────────
    // Global Error Handler
    // ────────────────────────────────────────────────
    console.error('[UNHANDLED_ERROR]', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error. Please try again later.' 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})