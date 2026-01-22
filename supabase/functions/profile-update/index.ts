// supabase/functions/profile-update/index.ts

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper: Sanitize string input (basic)
function sanitize(input: string): string {
  return input.replace(/[<>]/g, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Parse auth header to get user
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Initialize Supabase client as the user
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  // Get user info from token
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Parse multipart/form-data for avatar upload, or JSON for text fields
  let full_name = '', bio = '', avatarFile = null
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('multipart/form-data')) {
    // Deno does not natively support multipart parsing; use a library or handle in frontend and send avatar as base64 or URL
    return new Response(
      JSON.stringify({ error: 'Multipart/form-data not supported in this example. Please upload avatar separately.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } else {
    // Expect JSON: { full_name, bio, avatar_base64 }
    try {
      const body = await req.json()
      full_name = sanitize(body.full_name || '')
      bio = sanitize(body.bio || '')
      avatarFile = body.avatar_base64 || null // base64 string or null
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  // Validate input lengths
  if (full_name.length > 100 || bio.length > 500) {
    return new Response(
      JSON.stringify({ error: 'Input too long.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 1. Handle avatar upload if provided
  let avatar_url = null
  if (avatarFile) {
    // Decode base64 and upload to 'avatars' bucket
    const fileName = `${user.id}_${Date.now()}.png`
    const fileData = Uint8Array.from(atob(avatarFile), c => c.charCodeAt(0))
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, fileData, { contentType: 'image/png', upsert: true })

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Failed to upload avatar.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)
    avatar_url = publicUrlData.publicUrl

    // Delete old avatar if exists
    const { data: profileData } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()
    if (profileData && profileData.avatar_url) {
      const oldPath = profileData.avatar_url.split('/').pop()
      if (oldPath && oldPath !== fileName) {
        await supabase.storage.from('avatars').remove([oldPath])
      }
    }
  }

  // 2. Update profiles table
  const updateFields: any = {}
  if (full_name) updateFields.full_name = full_name
  if (bio) updateFields.bio = bio
  if (avatar_url) updateFields.avatar_url = avatar_url

  if (Object.keys(updateFields).length === 0) {
    return new Response(
      JSON.stringify({ error: 'No fields to update.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updateFields)
    .eq('id', user.id)
    .select()
    .single()

  if (updateError) {
    return new Response(
      JSON.stringify({ error: 'Failed to update profile.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 3. Return updated profile
  return new Response(
    JSON.stringify({ profile: updatedProfile, error: null }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

/*
EXPLANATION:
- This function updates the user's profile (name, bio, avatar).
- It authenticates the user using the JWT from the Authorization header.
- It validates and sanitizes inputs to prevent XSS and other attacks.
- If an avatar is provided (as base64), it uploads to the 'avatars' storage bucket, gets the public URL, and deletes the old avatar.
- It updates the profiles table with the new data and returns the updated profile.
- All responses include CORS headers for frontend compatibility.
- For production, consider using a proper multipart parser or handle avatar uploads separately.
*/