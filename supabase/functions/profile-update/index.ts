// supabase/functions/profile-update/index.ts

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function sanitize(input: string | undefined): string {
  if (!input) return ''
  return input.replace(/[<>'"]/g, '').trim()
}

function validateBase64Image(base64: string): { valid: boolean; error?: string } {
  if (!base64) return { valid: false, error: 'No image data provided' }

  if (!/^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(base64)) {
    return { valid: false, error: 'Invalid image format. Only PNG, JPEG, GIF, WebP allowed.' }
  }

  const base64Data = base64.split(',')[1]
  const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0
  const sizeInBytes = Math.floor((base64Data.length * 3) / 4) - padding
  const maxSize = 5 * 1024 * 1024 // 5 MB

  if (sizeInBytes > maxSize) {
    return { valid: false, error: 'Image too large. Maximum size is 5MB.' }
  }

  return { valid: true }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Get and validate token
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. No token provided.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Initialize Supabase client with user token
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  // Verify user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Parse request body
  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Prepare fields to update (only include provided fields)
  const updateFields: Record<string, any> = {}

  if ('full_name' in body) {
    updateFields.full_name = sanitize(body.full_name).slice(0, 255)
  }
  if ('bio' in body) {
    updateFields.bio = sanitize(body.bio)
  }
  if ('phone' in body) {
    updateFields.phone = sanitize(body.phone).slice(0, 20)
  }
  if ('address' in body) {
    updateFields.address = sanitize(body.address)
  }
  if ('organization' in body) {
    updateFields.organization = sanitize(body.organization).slice(0, 255)
  }
  if ('department' in body) {
    updateFields.department = sanitize(body.department).slice(0, 255)
  }

  // Account type – only allow valid values (optional: remove if it should be immutable)
  if ('account_type' in body) {
    const validTypes = ['personal', 'corporate', 'institutional']
    if (validTypes.includes(body.account_type)) {
      updateFields.account_type = body.account_type
    }
  }

  // Avatar handling
  const avatar_base64 = body.avatar_base64 ?? null

  if (avatar_base64) {
    const validation = validateBase64Image(avatar_base64)
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const mimeMatch = avatar_base64.match(/^data:image\/(\w+);base64,/)
    const extension = mimeMatch ? mimeMatch[1].toLowerCase() : 'png'
    const contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`

    const fileName = `${user.id}/${crypto.randomUUID()}.${extension}`

    const base64Data = avatar_base64.split(',')[1]
    const fileData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, fileData, {
        contentType,
        upsert: true,
        cacheControl: '3600'
      })

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Failed to upload avatar', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
    updateFields.avatar_url = urlData.publicUrl

    // Attempt to delete old avatar (non-blocking, best-effort)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()

      if (profile?.avatar_url) {
        const oldUrl = new URL(profile.avatar_url)
        let oldPath = oldUrl.pathname
        if (oldPath.startsWith('/')) oldPath = oldPath.slice(1)
        if (oldPath.startsWith('avatars/')) oldPath = oldPath.slice(8)

        if (oldPath && oldPath !== fileName) {
          supabase.storage.from('avatars').remove([oldPath]).catch(() => {})
        }
      }
    } catch {
      // silent fail – cleanup is optional
    }
  }

  // Check if there's anything to update
  if (Object.keys(updateFields).length === 0) {
    return new Response(
      JSON.stringify({ error: 'No fields to update. Provide at least one field.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Perform the update
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updateFields)
    .eq('id', user.id)
    .select()
    .single()

  if (updateError) {
    return new Response(
      JSON.stringify({ error: 'Failed to update profile', details: updateError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Optional: sync full_name to auth.user metadata (non-blocking)
  if (updateFields.full_name) {
    supabase.auth.updateUser({ data: { full_name: updateFields.full_name } }).catch(() => {})
  }

  // Success response
  return new Response(
    JSON.stringify({
      message: 'Profile updated successfully',
      profile: updatedProfile
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})