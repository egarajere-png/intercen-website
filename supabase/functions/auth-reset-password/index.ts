// supabase/functions/auth-reset-password/index.ts

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.203.0/crypto/mod.ts"

// Helper: Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Helper: Validate password strength
function isStrongPassword(password: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)
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

  // Step 1: Request password reset
  if (body.email) {
    const { email } = body

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if user exists
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      // Do not reveal if user exists for security
      return new Response(
        JSON.stringify({ message: 'If the email exists, a reset link will be sent.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate secure reset token and expiry (1 hour)
    const token = crypto.randomUUID()
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    // Store token in password_reset_tokens table
    await supabase
      .from('password_reset_tokens')
      .insert([
        {
          user_id: userData.id,
          token,
          expires_at
        }
      ])

    // Send email with reset link (replace with your email logic)
    // Example: await sendResetEmail(email, token)
    // The link should point to your frontend: https://yourapp.com/reset-password?token=...

    return new Response(
      JSON.stringify({ message: 'If the email exists, a reset link will be sent.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Step 2: Validate token and update password
  if (body.token && body.new_password) {
    const { token, new_password } = body

    if (!isStrongPassword(new_password)) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters, include a letter and a number.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify token exists and not expired
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .single()

    if (
      tokenError ||
      !tokenData ||
      new Date(tokenData.expires_at) < new Date()
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update password via Supabase Auth Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password: new_password }
    )

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update password.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete used token
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('token', token)

    // Send confirmation email (replace with your email logic)
    // Example: await sendConfirmationEmail(user.email)

    return new Response(
      JSON.stringify({ message: 'Password updated successfully.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // If neither flow matches, return error
  return new Response(
    JSON.stringify({ error: 'Invalid request.' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

/*
EXPLANATION:
- This function handles both requesting a password reset and performing the reset.
- Step 1: User submits email. If the user exists, a secure token is generated, stored, and a reset email is sent.
- Step 2: User submits token and new password. The token is validated, the password is updated, and the token is deleted.
- All responses include CORS headers for frontend compatibility.
- Errors are handled gracefully and returned with clear messages.
- Replace the email sending logic with your provider (SendGrid, Resend, etc.).
- The function is designed to work with your password_reset_tokens table.
*/