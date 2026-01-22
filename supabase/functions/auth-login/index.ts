// supabase/functions/auth-login/index.ts

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper: Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { email, password } = body

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: 'Email and password are required.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!isValidEmail(email)) {
    return new Response(
      JSON.stringify({ error: 'Invalid email format.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Initialize Supabase client with service role key
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Authenticate user with Supabase Auth
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (signInError) {
    return new Response(
      JSON.stringify({ error: 'Invalid credentials.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const user = signInData.user
  const session = signInData.session

  // 2. Update last_login_at in profiles table
  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id)

  // 3. Log login event in audit_logs table
  // The audit_logs table should have: id, user_id, action, ip_address, created_at
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  await supabase
    .from('audit_logs')
    .insert([
      {
        user_id: user.id,
        action: 'login',
        ip_address: ip
      }
    ])

  // 4. Return session and user info
  return new Response(
    JSON.stringify({
      session,
      user: {
        id: user.id,
        email: user.email
      },
      error: null
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

/*
EXPLANATION:
- This function handles user login.
- It validates input, authenticates with Supabase Auth, updates the user's last login timestamp, and logs the login event for security.
- All responses include CORS headers for frontend compatibility.
- Errors are handled gracefully and returned with clear messages.
- The function is designed to work with your existing profiles and audit_logs tables.
*/