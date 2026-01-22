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
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)
}

// Main handler for the Edge Function

Deno.serve(async (req) => {
  try {
    // Allow preflight OPTIONS requests for CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Parse request body as JSON
    let body
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract and validate input fields
    const { email, password, full_name } = body

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and full_name are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isStrongPassword(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters, include a letter and a number.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key (for server-side operations)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Register user with Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name }
      }
    })

    if (signUpError) {
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
      return new Response(
        JSON.stringify({ error: 'Failed to create user.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Insert into profiles table (see your 20260121145931_profiles.sql migration)
    // The profiles table should have at least: id (uuid), full_name (text), email (text)
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
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Create default "My Library" collection for the user (see 20260122043634_collections.sql)
    // The collections table should have: id (uuid), user_id (uuid), name (text), created_at (timestamp)
    const { error: collectionError } = await supabase
      .from('collections')
      .insert([
        {
          user_id: user.id,
          name: 'My Library'
        }
      ])

    if (collectionError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create default collection.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Send welcome email (using an external service, e.g., Resend, SendGrid, etc.)
    // This is a placeholder. Replace with your actual email sending logic.
    try {
      // await sendWelcomeEmail(email, full_name)
      // Example: await fetch('https://api.resend.com/send', { ... })
    } catch {
      // If email fails, don't block registration, just log
      // Optionally, you can log this error somewhere
    }

    // 5. Return user data and session token
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
  } catch (err) {
    // Catch-all error handler
    return new Response(
      JSON.stringify({ error: 'Unexpected server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
});

/*
EXPLANATION:
- This function handles user registration with business logic.
- It validates input, creates the user in Supabase Auth, adds a profile, creates a default collection, and (optionally) sends a welcome email.
- All responses include CORS headers for frontend compatibility.
- Errors are handled gracefully and returned with clear messages.
- You can extend the email sending logic as needed for your provider.
- The function is designed to work with your existing migrations for profiles and collections.
*/