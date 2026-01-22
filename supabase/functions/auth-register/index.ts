// supabase/functions/auth-register/index.ts

// Import CORS headers for cross-origin requests
import { corsHeaders } from '../_shared/cors.ts'

// Import Supabase client for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper: Validate email format using regex
function isValidEmail(email: string): boolean {
  // Simple but effective email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Helper: Validate password strength (min 8 chars, at least 1 letter and 1 number)
function isStrongPassword(password: string): boolean {
  // Must be at least 8 characters
  if (password.length < 8) {
    return false
  }
  
  // Must contain at least one letter
  if (!/[A-Za-z]/.test(password)) {
    return false
  }
  
  // Must contain at least one number
  if (!/\d/.test(password)) {
    return false
  }
  
  // All checks passed
  return true
}

// Main handler for the Edge Function
Deno.serve(async (req) => {
  console.log('=== Auth Register Request Started ===');
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
  const { email, password, full_name } = body
  
  console.log('Extracted fields:', {
    email: email || 'MISSING',
    password: password ? `***${password.length} chars***` : 'MISSING',
    full_name: full_name || 'MISSING'
  })

  // Check for missing fields
  if (!email || !password || !full_name) {
    console.error('Validation failed: Missing required fields')
    return new Response(
      JSON.stringify({ error: 'Email, password, and full_name are required.' }),
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

  // Validate password strength
  if (!isStrongPassword(password)) {
    console.error('Validation failed: Weak password')
    console.error('Password details:', {
      length: password.length,
      hasLetter: /[A-Za-z]/.test(password),
      hasNumber: /\d/.test(password)
    })
    return new Response(
      JSON.stringify({ 
        error: 'Password must be at least 8 characters and include at least one letter and one number.' 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('All validations passed')

  // Initialize Supabase client with service role key (for server-side operations)
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

  // 1. Register user with Supabase Auth
  console.log('Attempting to sign up user...')
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name }
    }
  })

  if (signUpError) {
    console.error('Sign up error:', signUpError)
    // Handle common errors
    let message = signUpError.message
    if (message.includes('User already registered')) {
      message = 'Email already exists.'
    }
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const user = signUpData.user
  const session = signUpData.session

  if (!user) {
    console.error('No user returned from sign up')
    return new Response(
      JSON.stringify({ error: 'Failed to create user account.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('User created successfully:', user.id)

  // 2. Insert into profiles table
  console.log('Creating user profile...')
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([
      {
        id: user.id, // Use the same UUID as auth.users
        full_name,
        email
      }
    ])

  if (profileError) {
    console.error('Profile creation error:', profileError)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create user profile.',
        details: profileError.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('Profile created successfully')

  // 3. Create default "My Library" collection for the user
  console.log('Creating default collection...')
  const { error: collectionError } = await supabase
    .from('collections')
    .insert([
      {
        user_id: user.id,
        name: 'My Library'
      }
    ])

  if (collectionError) {
    console.error('Collection creation error:', collectionError)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create default collection.',
        details: collectionError.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('Collection created successfully')

  // 4. Send welcome email (placeholder)
  try {
    // await sendWelcomeEmail(email, full_name)
    console.log('Welcome email would be sent here')
  } catch (emailError) {
    console.warn('Email sending failed (non-blocking):', emailError)
  }

  // 5. Return user data and session token
  console.log('Registration completed successfully')
  console.log('=== Auth Register Request Completed ===')
  
  return new Response(
    JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        full_name
      },
      session,
      error: null
    }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

/*
CHANGELOG v2:
- Fixed password validation to allow ALL special characters
- Changed from restrictive regex to permissive validation (checks for letter and number only)
- Added detailed password validation logging
- Now accepts passwords with any special characters: !@#$%^&*(){}[]<>?/\|`~etc.
- Password requirements: 8+ characters, at least 1 letter, at least 1 number

DEBUGGING TIPS:
1. Check Supabase Dashboard → Edge Functions → auth-register → Logs
2. Look for "Password details" log to see what validation failed
3. Password like "V6V{w8Eap)4i%LCyN3" will now pass validation
*/