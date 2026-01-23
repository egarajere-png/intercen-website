// supabase/functions/profile-update/index.ts
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function sanitize(input: string | undefined): string {
  if (!input) return ''
  return input
    .replace(/[^\p{L}\p{N}\s\-',.()@&]/gu, '')
    .trim()
}

function validateBase64Image(base64: string): { valid: boolean; error?: string } {
  if (!base64) return { valid: false, error: 'No image data provided' }

  const prefixRegex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/
  if (!prefixRegex.test(base64)) {
    return { valid: false, error: 'Invalid image format. Only PNG, JPEG, GIF, WebP allowed.' }
  }

  const base64Data = base64.split(',')[1]
  if (!base64Data || base64Data.trim() === '') {
    return { valid: false, error: 'Empty or missing base64 image content' }
  }

  const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0
  const sizeInBytes = Math.floor((base64Data.length * 3) / 4) - padding

  const maxSize = 5 * 1024 * 1024 // 5MB
  if (sizeInBytes > maxSize) {
    return { valid: false, error: 'Image too large. Maximum size is 5MB.' }
  }

  if (sizeInBytes < 100) {
    return { valid: false, error: 'Image data too small to be a valid image' }
  }

  return { valid: true }
}

function safeBase64Decode(base64: string): Uint8Array | null {
  try {
    const binary = atob(base64)
    return Uint8Array.from(binary, c => c.charCodeAt(0))
  } catch (err) {
    console.error('[BASE64] Decode failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

Deno.serve(async (req) => {
  const method = req.method
  const url = new URL(req.url)
  const path = url.pathname

  console.log(`[REQUEST] ${method} ${path} from ${req.headers.get('user-agent') || 'unknown'}`)

  try {
    if (method === 'OPTIONS') {
      console.log('[OPTIONS] CORS preflight handled')
      return new Response('ok', { headers: corsHeaders })
    }

    if (method !== 'POST') {
      console.log(`[REJECT] Method not allowed: ${method}`)
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    console.log('[AUTH] Authorization header present:', !!authHeader)
    console.log('[AUTH] Token length:', token.length)
    console.log('[AUTH] Token prefix:', token.substring(0, 10) + (token.length > 10 ? '...' : ''))

    if (!token) {
      console.log('[AUTH] Missing token → 401')
      return new Response(JSON.stringify({ error: 'Unauthorized - No token provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[CONFIG] Missing SUPABASE_URL or SUPABASE_ANON_KEY')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    console.log('[AUTH] Fetching user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError) {
      console.error('[AUTH ERROR]', userError.message, userError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', details: userError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user) {
      console.error('[AUTH] No user returned')
      return new Response(JSON.stringify({ error: 'No authenticated user found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[AUTH OK] User:', user.id, user.email || '(email hidden)')

    // ────────────────────────────────────────────────
    // Parse request body
    // ────────────────────────────────────────────────

    let body: any
    try {
      body = await req.json()
      console.log('[BODY] Parsed. Keys:', Object.keys(body).join(', ') || 'empty')
    } catch (err) {
      console.error('[BODY] Invalid JSON:', err instanceof Error ? err.message : String(err))
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const updateFields: Record<string, any> = {}

    if ('full_name' in body && body.full_name) {
      updateFields.full_name = sanitize(body.full_name).slice(0, 255)
    }
    if ('bio' in body) {
      updateFields.bio = sanitize(body.bio ?? '').slice(0, 1000)
    }
    if ('phone' in body) {
      updateFields.phone = sanitize(body.phone ?? '').slice(0, 20)
    }
    if ('address' in body) {
      updateFields.address = sanitize(body.address ?? '').slice(0, 500)
    }
    if ('organization' in body) {
      updateFields.organization = sanitize(body.organization ?? '').slice(0, 255)
    }
    if ('department' in body) {
      updateFields.department = sanitize(body.department ?? '').slice(0, 255)
    }
    if ('account_type' in body) {
      const valid = ['personal', 'corporate', 'institutional']
      if (valid.includes(body.account_type)) {
        updateFields.account_type = body.account_type
      }
    }

    console.log('[FIELDS] Preparing to update:', Object.keys(updateFields))

    // ────────────────────────────────────────────────
    // Avatar handling with better diagnostics
    // ────────────────────────────────────────────────

    const avatar_base64 = body.avatar_base64 ?? null
    if (avatar_base64) {
      console.log('[AVATAR] Received, length:', avatar_base64.length)

      // Show first part to diagnose junk data
      const preview = avatar_base64.substring(0, Math.min(80, avatar_base64.length))
      console.log('[AVATAR PREFIX]', preview + (avatar_base64.length > 80 ? '...' : ''))

      if (avatar_base64.length < 120) {
        console.log('[AVATAR REJECT] Too short to be valid image')
        return new Response(JSON.stringify({
          error: 'Avatar data is too short to be a valid image'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const validation = validateBase64Image(avatar_base64)
      if (!validation.valid) {
        console.log('[AVATAR VALIDATION FAILED]', validation.error)
        return new Response(JSON.stringify({ error: validation.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const mimeMatch = avatar_base64.match(/^data:image\/(\w+);base64,/)
      if (!mimeMatch) {
        console.log('[AVATAR] Mime regex failed after validation pass')
        return new Response(JSON.stringify({ error: 'Invalid image data URI' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const extRaw = mimeMatch[1].toLowerCase()
      const ext = extRaw === 'jpg' ? 'jpeg' : extRaw
      const contentType = `image/${ext}`

      const base64Data = avatar_base64.split(',')[1]
      if (!base64Data || base64Data.length < 50) {
        console.log('[AVATAR] Empty or tiny base64 payload after split')
        return new Response(JSON.stringify({ error: 'Invalid or empty image content' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const fileData = safeBase64Decode(base64Data)
      if (!fileData) {
        console.log('[AVATAR] Base64 decode failed')
        return new Response(JSON.stringify({ error: 'Corrupted base64 image data' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log('[AVATAR] Decoded successfully, bytes:', fileData.length)

      const fileName = `${user.id.slice(0, 8)}/${crypto.randomUUID()}.${ext}`

      console.log('[STORAGE] Uploading:', fileName, contentType, `${(fileData.length / 1024).toFixed(1)} KB`)

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, fileData, {
          contentType,
          upsert: true,
          cacheControl: 'public, max-age=31536000',
        })

      if (uploadError) {
        console.error('[STORAGE ERROR]', uploadError.message)
        return new Response(JSON.stringify({ error: 'Avatar upload failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      updateFields.avatar_url = urlData.publicUrl
      console.log('[STORAGE] Uploaded →', urlData.publicUrl)

      // Best-effort old avatar cleanup
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single()

        if (profile?.avatar_url) {
          const oldPath = new URL(profile.avatar_url).pathname
            .replace(/^\/+/, '')
            .replace(/^avatars\//, '')

          if (oldPath && oldPath !== fileName) {
            const { error: delErr } = await supabase.storage.from('avatars').remove([oldPath])
            if (delErr) {
              console.warn('[CLEANUP] Failed to delete old avatar:', delErr.message)
            } else {
              console.log('[CLEANUP] Deleted old:', oldPath)
            }
          }
        }
      } catch (cleanupErr) {
        console.warn('[CLEANUP] Error (non-fatal):', cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr))
      }
    }

    if (Object.keys(updateFields).length === 0) {
      console.log('[UPDATE] No fields changed')
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[DB] Updating profile...')
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateFields)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('[DB ERROR]', updateError.message)
      return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[DB] Profile updated successfully')

    // Optional non-blocking auth metadata sync
    if (updateFields.full_name) {
      supabase.auth.updateUser({ data: { full_name: updateFields.full_name } })
        .catch(e => console.warn('[AUTH SYNC] Failed:', e.message))
    }

    return new Response(
      JSON.stringify({ message: 'Profile updated successfully', profile: updatedProfile }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[CRASH]', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})