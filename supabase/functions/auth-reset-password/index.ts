import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function sendResetEmailViaResend(
  supabase: any,
  email: string,
  full_name: string
): Promise<boolean> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping Resend')
      return false
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'

    console.log('📧 Generating Supabase reset link for Resend email')

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${appUrl}/reset-password`
      }
    })

    if (error || !data?.properties?.action_link) {
      console.error('Failed to generate Supabase reset link:', error)
      return false
    }

    const resetLink = data.properties.action_link
    console.log('✅ Supabase reset link generated successfully')

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'InterCEN Books <onboarding@resend.dev>',
        to: [email],
        subject: 'Reset Your InterCEN Books Password',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #1E1E1E; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-family: Georgia, serif;">InterCEN Books</h1>
              </div>

              <div style="background: #f9f5ef; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>

                <p>Hi ${full_name || 'there'},</p>

                <p>We received a request to reset your password. Click the button below to create a new password:</p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}"
                     style="background: #B11226;
                            color: white;
                            padding: 15px 30px;
                            text-decoration: none;
                            border-radius: 8px;
                            display: inline-block;
                            font-weight: bold;">
                    Reset Password
                  </a>
                </div>

                <p style="color: #666; font-size: 14px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${resetLink}" style="color: #B11226; word-break: break-all;">${resetLink}</a>
                </p>

                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  <strong>This link will expire in 1 hour.</strong>
                </p>

                <p style="color: #666; font-size: 14px;">
                  If you didn't request a password reset, you can safely ignore this email.
                </p>

                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

                <p style="color: #999; font-size: 12px; text-align: center;">
                  © 2024 InterCEN Books. All rights reserved.
                </p>
              </div>
            </body>
          </html>
        `,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Resend API error:', errorText)
      return false
    }

    const result = await response.json()
    console.log('✅ Email sent successfully via Resend, ID:', result.id)
    return true
  } catch (error) {
    console.error('❌ Error sending email via Resend:', error)
    return false
  }
}

async function sendResetEmailViaSupabase(
  supabase: any,
  email: string
): Promise<boolean> {
  try {
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'

    console.log('📧 Sending password reset via Supabase Auth to:', email)
    console.log('🔗 Redirect URL:', `${appUrl}/reset-password`)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    })

    if (error) {
      console.error('❌ Supabase resetPasswordForEmail error:', error)
      return false
    }

    console.log('✅ Password reset email sent via Supabase Auth')
    return true
  } catch (error) {
    console.error('❌ Error in sendResetEmailViaSupabase:', error)
    return false
  }
}

Deno.serve(async (req) => {
  console.log('=== Auth Reset Password Request Started ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body
  try {
    const rawBody = await req.text()
    body = JSON.parse(rawBody)
    console.log('Parsed body keys:', Object.keys(body))
  } catch (parseError) {
    console.error('JSON parse error:', parseError)
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  if (body.email) {
    console.log('Password reset requested for email:', body.email)
    const { email } = body

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── FIX: Look up user directly from Supabase Auth, not profiles table ──
    console.log('Checking if user exists in Supabase Auth...')
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      // Still return success for security
      return new Response(
        JSON.stringify({ message: 'If the email exists, a reset link will be sent.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = listData?.users?.find((u: any) => u.email === email)

    if (!user) {
      console.log('User not found in Auth (returning success for security)')
      return new Response(
        JSON.stringify({ message: 'If the email exists, a reset link will be sent.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User found in Auth:', user.id)

    // Get full name from user metadata
    const fullName = user.user_metadata?.full_name || 'there'

    // Try Resend first, then fall back to Supabase built-in email
    let emailSent = false
    const resendConfigured = !!Deno.env.get('RESEND_API_KEY')

    if (resendConfigured) {
      console.log('📧 RESEND_API_KEY found - using Resend with custom branding')
      emailSent = await sendResetEmailViaResend(supabase, email, fullName)
    } else {
      console.log('📧 RESEND_API_KEY not found - falling back to Supabase Auth email')
    }

    if (!emailSent) {
      console.log('📧 Attempting Supabase Auth email (fallback)')
      emailSent = await sendResetEmailViaSupabase(supabase, email)
    }

    if (!emailSent) {
      console.error('❌ All email sending methods failed')
    } else {
      console.log('✅ Password reset email sent successfully')
    }

    console.log('=== Auth Reset Password Request Completed ===')

    return new Response(
      JSON.stringify({ message: 'If the email exists, a reset link will be sent.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ error: 'Invalid request. Provide email to request password reset.' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})