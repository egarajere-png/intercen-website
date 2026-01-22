// supabase/functions/profile-update/index.ts

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper: Sanitize string input to prevent XSS
function sanitize(input: string): string {
  if (!input) return ''
  // Remove potentially dangerous characters
  return input.replace(/[<>'"]/g, '').trim()
}

// Helper: Validate image file size and type from base64
function validateBase64Image(base64: string): { valid: boolean; error?: string } {
  if (!base64) return { valid: false, error: 'No image data provided' }
  
  // Check if it's a valid base64 string
  if (!/^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(base64)) {
    return { valid: false, error: 'Invalid image format. Only PNG, JPEG, GIF, and WebP are supported.' }
  }
  
  // Extract base64 data
  const base64Data = base64.split(',')[1]
  
  // Calculate file size (base64 is ~33% larger than original)
  const sizeInBytes = (base64Data.length * 3) / 4
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  if (sizeInBytes > maxSize) {
    return { valid: false, error: 'Image too large. Maximum size is 5MB.' }
  }
  
  return { valid: true }
}

Deno.serve(async (req) => {
  console.log('=== Profile Update Request Started ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  // Allow preflight OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response('ok', { headers: corsHeaders })
  }

  // Parse auth header to get user token
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  console.log('Authorization header present:', !!authHeader)
  console.log('Token extracted:', token ? `${token.substring(0, 10)}...` : 'MISSING')

  if (!token) {
    console.error('Authentication failed: No token provided')
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Please provide a valid authentication token.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('Initializing Supabase client...')
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  // Get user info from token
  console.log('Verifying user token...')
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError) {
    console.error('User verification error:', userError)
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!user) {
    console.error('No user found for token')
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('User authenticated:', user.id)

  // Parse request body
  let full_name = '', bio = '', avatar_base64 = null
  const contentType = req.headers.get('content-type') || ''
  
  console.log('Content-Type:', contentType)

  if (contentType.includes('multipart/form-data')) {
    console.error('Multipart form data not supported')
    return new Response(
      JSON.stringify({ 
        error: 'Please send data as JSON with avatar as base64 string. Example: {"full_name": "John", "bio": "Hello", "avatar_base64": "data:image/png;base64,..."}'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Expect JSON: { full_name?, bio?, avatar_base64? }
  try {
    const rawBody = await req.text()
    console.log('Raw body length:', rawBody.length)
    
    const body = JSON.parse(rawBody)
    console.log('Parsed body keys:', Object.keys(body))
    
    full_name = body.full_name ? sanitize(body.full_name) : ''
    bio = body.bio ? sanitize(body.bio) : ''
    avatar_base64 = body.avatar_base64 || null
    
    console.log('Extracted fields:', {
      full_name: full_name || 'NOT_PROVIDED',
      bio: bio || 'NOT_PROVIDED',
      avatar_base64: avatar_base64 ? 'PROVIDED' : 'NOT_PROVIDED'
    })
  } catch (parseError) {
    console.error('JSON parse error:', parseError)
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate input lengths
  if (full_name && full_name.length > 100) {
    console.error('Validation failed: Full name too long')
    return new Response(
      JSON.stringify({ error: 'Full name must be 100 characters or less.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (bio && bio.length > 500) {
    console.error('Validation failed: Bio too long')
    return new Response(
      JSON.stringify({ error: 'Bio must be 500 characters or less.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('Input validation passed')

  // 1. Handle avatar upload if provided
  let avatar_url = null
  if (avatar_base64) {
    console.log('Processing avatar upload...')
    
    // Validate image
    const validation = validateBase64Image(avatar_base64)
    if (!validation.valid) {
      console.error('Avatar validation failed:', validation.error)
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract file extension from data URI
    const mimeMatch = avatar_base64.match(/^data:image\/(\w+);base64,/)
    const extension = mimeMatch ? mimeMatch[1] : 'png'
    const contentType = `image/${extension}`
    
    // Generate unique filename
    const fileName = `${user.id}_${Date.now()}.${extension}`
    console.log('Uploading avatar as:', fileName)

    // Decode base64
    const base64Data = avatar_base64.split(',')[1]
    const fileData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    console.log('File size:', fileData.length, 'bytes')

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, fileData, { 
        contentType,
        upsert: true,
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to upload avatar.',
          details: uploadError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Avatar uploaded successfully:', uploadData.path)

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)
    
    avatar_url = publicUrlData.publicUrl
    console.log('Public URL:', avatar_url)

    // Delete old avatar if exists
    console.log('Checking for old avatar to delete...')
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()
      
      if (profileData && profileData.avatar_url) {
        const oldFileName = profileData.avatar_url.split('/').pop()
        if (oldFileName && oldFileName !== fileName) {
          console.log('Deleting old avatar:', oldFileName)
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([oldFileName])
          
          if (deleteError) {
            console.warn('Old avatar deletion failed (non-blocking):', deleteError)
          } else {
            console.log('Old avatar deleted')
          }
        }
      }
    } catch (deleteError) {
      console.warn('Could not delete old avatar (non-blocking):', deleteError)
    }
  }

  // 2. Build update fields
  const updateFields: any = {}
  if (full_name) updateFields.full_name = full_name
  if (bio) updateFields.bio = bio
  if (avatar_url) updateFields.avatar_url = avatar_url

  console.log('Fields to update:', Object.keys(updateFields))

  if (Object.keys(updateFields).length === 0) {
    console.error('No fields to update')
    return new Response(
      JSON.stringify({ error: 'No fields to update. Please provide full_name, bio, or avatar_base64.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 3. Update profiles table
  console.log('Updating profile in database...')
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updateFields)
    .eq('id', user.id)
    .select()
    .single()

  if (updateError) {
    console.error('Profile update error:', updateError)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update profile.',
        details: updateError.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('Profile updated successfully')

  // 4. Update auth user metadata (optional)
  if (full_name) {
    console.log('Updating auth metadata...')
    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name }
      })
      
      if (metadataError) {
        console.warn('Auth metadata update error (non-blocking):', metadataError)
      } else {
        console.log('Auth metadata updated')
      }
    } catch (metadataException) {
      console.warn('Auth metadata update failed (non-blocking):', metadataException)
    }
  }

  // 5. Log profile update event
  console.log('Logging profile update event...')
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert([
        {
          user_id: user.id,
          action: 'profile_updated',
          ip_address: ip,
          metadata: { fields: Object.keys(updateFields) }
        }
      ])

    if (auditError) {
      console.warn('Audit log creation error (non-blocking):', auditError)
    } else {
      console.log('Profile update event logged')
    }
  } catch (auditException) {
    console.warn('Audit logging failed (table may not exist):', auditException)
  }

  console.log('Profile update completed successfully')
  console.log('=== Profile Update Request Completed ===')

  // 6. Return updated profile
  return new Response(
    JSON.stringify({ 
      profile: updatedProfile,
      message: 'Profile updated successfully.',
      error: null 
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

/*
CHANGELOG:
- Added comprehensive logging throughout the function
- Improved avatar validation (size, format, mime type)
- Better error messages with details
- Made auxiliary operations non-blocking (old avatar deletion, audit logs)
- Updates auth user metadata when name changes
- Logs profile update events
- Supports multiple image formats (PNG, JPEG, GIF, WebP)
- Added file size limit (5MB)
- Better sanitization of inputs
- Extracts correct file extension from data URI

KEY FEATURES:
1. JWT authentication via Authorization header
2. Updates full_name, bio, and avatar
3. Uploads avatar to Supabase Storage (avatars bucket)
4. Automatically deletes old avatar
5. Validates image size and format
6. Updates both profiles table and auth metadata
7. Logs update events for security

REQUIRED SETUP:
1. Create 'avatars' storage bucket in Supabase
2. Make bucket public or set appropriate RLS policies
3. Add bio column to profiles: ALTER TABLE profiles ADD COLUMN bio TEXT;

USAGE EXAMPLE:
POST /profile-update
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "full_name": "John Doe",
  "bio": "Software developer and book lover",
  "avatar_base64": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}

DEBUGGING TIPS:
1. Check Supabase Dashboard → Edge Functions → profile-update → Logs
2. Verify avatars bucket exists and is configured correctly
3. Check that user has valid JWT token
4. Verify profiles table has bio column
*/