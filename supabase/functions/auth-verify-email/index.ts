// supabase/functions/auth-verify-email/index.ts

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper: Validate token format (simple UUID check)
function isValidToken(token: string): boolean {
  return /^[0-9a-fA-F-]{36,}$/.test(token)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Parse request body or query params for token
  let token = ''
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      token = body.token
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } else if (req.method === 'GET') {
    const url = new URL(req.url)
    token = url.searchParams.get('token') || ''
  }

  if (!token || !isValidToken(token)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing verification token.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Find user by verification token (assumes you store a verification_token in profiles)
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('id, email, is_verified')
    .eq('verification_token', token)
    .single()

  if (userError || !userData) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired verification token.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 2. Update user verification status and clear the token
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      is_verified: true,
      verification_token: null // Remove token after use
    })
    .eq('id', userData.id)

  if (updateError) {
    return new Response(
      JSON.stringify({ error: 'Failed to verify email.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 3. (Optional) Unlock features for verified users in your app logic

  // 4. Respond with success
  return new Response(
    JSON.stringify({
      message: 'Email verified successfully. You can now access all features.',
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
EXPLANATION:
- This function handles email verification callbacks (GET or POST).
- It checks the verification token, updates the user's is_verified status, and clears the token.
- You should generate and store a verification_token in the profiles table when registering a user and send it in the verification email.
- After verification, you can unlock features for the user in your app based on is_verified.
- All responses include CORS headers for frontend compatibility.
*/