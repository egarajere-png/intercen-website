// supabase/functions/auth-login/index.ts

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper: Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

Deno.serve(async (req) => {
  console.log('=== Auth Login Request Started ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  // Allow preflight OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response('ok', { headers: corsHeaders })
  }

  // Parse request body as JSON
  let body
  try {
    const rawBody = await req.text()
    console.log('Raw body received:', rawBody)
    
    body = JSON.parse(rawBody)
    console.log('Parsed body:', JSON.stringify(body, null, 2))
  } catch (parseError) {
    console.error('JSON parse error:', parseError)
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Extract and validate input fields
  const { email, password } = body

  console.log('Extracted fields:', {
    email: email || 'MISSING',
    password: password ? '***PROVIDED***' : 'MISSING'
  })

  // Check for missing fields
  if (!email || !password) {
    console.error('Validation failed: Missing required fields')
    return new Response(
      JSON.stringify({ error: 'Email and password are required.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate email format
  if (!isValidEmail(email)) {
    console.error('Validation failed: Invalid email format')
    return new Response(
      JSON.stringify({ error: 'Invalid email format.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('All validations passed')

  // Initialize Supabase client with service role key
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

  // 1. Authenticate user with Supabase Auth
  console.log('Attempting to sign in user...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (signInError) {
    console.error('Sign in error:', signInError)
    return new Response(
      JSON.stringify({ error: 'Invalid email or password.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const user = signInData.user
  const session = signInData.session

  if (!user || !session) {
    console.error('No user or session returned from sign in')
    return new Response(
      JSON.stringify({ error: 'Authentication failed.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('User authenticated successfully:', user.id)

  // 2. Fetch user profile data
  console.log('Fetching user profile...')
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at, last_login_at')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.warn('Profile fetch error (non-blocking):', profileError)
    // Continue even if profile fetch fails
  } else {
    console.log('Profile fetched successfully')
  }

  // 3. Update last_login_at in profiles table
  console.log('Updating last login timestamp...')
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id)

  if (updateError) {
    console.warn('Last login update error (non-blocking):', updateError)
    // Continue even if update fails
  } else {
    console.log('Last login timestamp updated')
  }

  // 4. Log login event in audit_logs table (if it exists)
  console.log('Logging login event...')
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  
  try {
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert([
        {
          user_id: user.id,
          action: 'login',
          ip_address: ip
        }
      ])

    if (auditError) {
      console.warn('Audit log creation error (non-blocking):', auditError)
      // Continue even if audit log fails
    } else {
      console.log('Login event logged successfully')
    }
  } catch (auditException) {
    console.warn('Audit logging failed (table may not exist):', auditException)
    // Continue - audit_logs table might not exist yet
  }

  // 5. Return session and user info
  console.log('Login completed successfully')
  console.log('=== Auth Login Request Completed ===')

  return new Response(
    JSON.stringify({
      session,
      user: {
        id: user.id,
        email: user.email,
        full_name: profileData?.full_name || user.user_metadata?.full_name || null,
        created_at: profileData?.created_at || null,
        last_login_at: profileData?.last_login_at || null
      },
      error: null
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

/*
CHANGELOG:
- Added comprehensive logging throughout the function
- Added raw body logging before parsing
- Added validation logging for each step
- Added environment variable checks
- Added null checks for user and session objects
- Made profile updates and audit logs non-blocking (won't fail login if they error)
- Added profile data fetching to return full user info
- Improved error messages with more details
- Returns full_name and other profile data in response
- All logs can be viewed in Supabase Dashboard → Edge Functions → Logs

KEY IMPROVEMENTS:
1. Login won't fail if audit_logs table doesn't exist yet
2. Login won't fail if profile update fails
3. Returns complete user profile data including full_name
4. Better error handling and logging
5. Non-blocking auxiliary operations

DEBUGGING TIPS:
1. Check Supabase Dashboard → Edge Functions → auth-login → Logs
2. Look for console.log outputs to trace execution
3. Check which step is failing (if any)
4. Verify environment variables are set correctly
*/