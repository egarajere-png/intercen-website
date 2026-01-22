// supabase/functions/auth-verify-email/index.ts

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper: Validate token format (accepts both UUIDs and hex tokens)
function isValidToken(token: string): boolean {
  // Accept UUID format (36 chars with hyphens)
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(token)
  // Accept hex token format (32+ characters)
  const isHexToken = /^[0-9a-fA-F]{32,}$/.test(token)
  
  return isUUID || isHexToken
}

Deno.serve(async (req) => {
  console.log('=== Auth Verify Email Request Started ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  // Allow preflight OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response('ok', { headers: corsHeaders })
  }

  // Parse request body or query params for token
  let token = ''
  
  if (req.method === 'POST') {
    console.log('Processing POST request')
    try {
      const rawBody = await req.text()
      console.log('Raw body received:', rawBody)
      
      const body = JSON.parse(rawBody)
      token = body.token
      console.log('Token from POST body (first 10 chars):', token?.substring(0, 10) || 'MISSING')
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } else if (req.method === 'GET') {
    console.log('Processing GET request')
    const url = new URL(req.url)
    token = url.searchParams.get('token') || ''
    console.log('Token from query params (first 10 chars):', token?.substring(0, 10) || 'MISSING')
  } else {
    console.error('Unsupported method:', req.method)
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use GET or POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate token
  if (!token) {
    console.error('Validation failed: Token missing')
    return new Response(
      JSON.stringify({ error: 'Verification token is required.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!isValidToken(token)) {
    console.error('Validation failed: Invalid token format')
    return new Response(
      JSON.stringify({ error: 'Invalid verification token format.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('Token validation passed')

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('Initializing Supabase client...')
  const supabase = createClient(supabaseUrl, supabaseKey)

  // 1. Find user by verification token
  console.log('Looking up user by verification token...')
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('id, email, is_verified, verification_token')
    .eq('verification_token', token)
    .single()

  if (userError) {
    console.error('User lookup error:', userError)
    return new Response(
      JSON.stringify({ error: 'Invalid or expired verification token.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!userData) {
    console.error('No user found with this verification token')
    return new Response(
      JSON.stringify({ error: 'Invalid or expired verification token.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('User found:', userData.id)
  console.log('Current verification status:', userData.is_verified)

  // Check if already verified
  if (userData.is_verified) {
    console.log('User already verified')
    return new Response(
      JSON.stringify({
        message: 'Email already verified.',
        user: {
          id: userData.id,
          email: userData.email,
          is_verified: true
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 2. Update user verification status and clear the token
  console.log('Updating verification status...')
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      is_verified: true,
      verification_token: null, // Remove token after use
      verified_at: new Date().toISOString() // Optional: track when verified
    })
    .eq('id', userData.id)

  if (updateError) {
    console.error('Profile update error:', updateError)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to verify email.',
        details: updateError.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('User verified successfully')

  // 3. Update auth user metadata (optional but recommended)
  console.log('Updating auth user metadata...')
  try {
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      userData.id,
      {
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          email_verified: true
        }
      }
    )

    if (authUpdateError) {
      console.warn('Auth metadata update error (non-blocking):', authUpdateError)
    } else {
      console.log('Auth metadata updated')
    }
  } catch (authError) {
    console.warn('Auth update failed (non-blocking):', authError)
  }

  // 4. Log verification event in audit_logs (if table exists)
  console.log('Logging verification event...')
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert([
        {
          user_id: userData.id,
          action: 'email_verified',
          ip_address: ip
        }
      ])

    if (auditError) {
      console.warn('Audit log creation error (non-blocking):', auditError)
    } else {
      console.log('Verification event logged')
    }
  } catch (auditException) {
    console.warn('Audit logging failed (table may not exist):', auditException)
  }

  // 5. Send welcome email (placeholder)
  try {
    // TODO: Replace with actual email sending logic
    // await sendWelcomeEmail(userData.email, userData.full_name)
    console.log('Welcome email would be sent here')
  } catch (emailError) {
    console.warn('Welcome email failed (non-blocking):', emailError)
  }

  console.log('Email verification completed successfully')
  console.log('=== Auth Verify Email Request Completed ===')

  // 6. Respond with success
  return new Response(
    JSON.stringify({
      message: 'Email verified successfully! You can now access all features.',
      user: {
        id: userData.id,
        email: userData.email,
        is_verified: true
      }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

/*
CHANGELOG:
- Added comprehensive logging throughout the function
- Supports both GET and POST methods
- Improved token validation (accepts UUIDs and hex tokens)
- Added environment variable checks
- Made auxiliary operations non-blocking (auth metadata, audit logs, emails)
- Added check for already verified users
- Added verified_at timestamp tracking
- Updates both profiles table and auth metadata
- Logs verification events for security
- Better error handling and messages

KEY FEATURES:
1. Accepts both GET (query params) and POST (JSON body) requests
2. Validates token format (UUID or hex)
3. Updates is_verified in profiles table
4. Clears verification token after use
5. Updates Supabase Auth metadata
6. Logs verification event
7. Handles already-verified users gracefully

REQUIRED DATABASE CHANGES:
Add to profiles table:
- verification_token (text, nullable)
- is_verified (boolean, default false)
- verified_at (timestamptz, nullable)

INTEGRATION WITH REGISTRATION:
In auth-register, after creating user:
1. Generate verification token
2. Store in profiles.verification_token
3. Send verification email with link: https://yourapp.com/verify-email?token=TOKEN

DEBUGGING TIPS:
1. Check Supabase Dashboard → Edge Functions → auth-verify-email → Logs
2. Look for "User found" to confirm token lookup worked
3. Check verification status in logs
4. Verify profiles table has required columns
*/