// supabase/functions/auth-reset-password/index.ts

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper: Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Helper: Validate password strength (permissive - allows all special characters)
function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false
  if (!/[A-Za-z]/.test(password)) return false
  if (!/\d/.test(password)) return false
  return true
}

// Helper: Generate secure random token
function generateSecureToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Helper: Send password reset email using Supabase Auth (recommended)
async function sendResetEmailViaSupabase(
  supabase: any,
  email: string,
  token: string
): Promise<boolean> {
  try {
    // Get your app's URL from environment variable
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    const resetLink = `${appUrl}/reset-password?token=${token}`
    
    console.log('Sending reset email to:', email)
    console.log('Reset link:', resetLink)
    
    // Use Supabase Auth to send password reset email
    // This uses Supabase's built-in email templates
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetLink,
    })
    
    if (error) {
      console.error('Supabase email error:', error)
      return false
    }
    
    console.log('Reset email sent successfully via Supabase')
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

// Helper: Send email using Resend API (alternative - requires RESEND_API_KEY)
async function sendResetEmailViaResend(
  email: string,
  token: string,
  full_name: string
): Promise<boolean> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set, skipping Resend email')
      return false
    }
    
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    const resetLink = `${appUrl}/reset-password?token=${token}`
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BookHaven <noreply@yourdomain.com>', // Change this to your domain
        to: [email],
        subject: 'Reset Your BookHaven Password',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">BookHaven</h1>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
                
                <p>Hi ${full_name || 'there'},</p>
                
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            color: white; 
                            padding: 15px 30px; 
                            text-decoration: none; 
                            border-radius: 5px; 
                            display: inline-block;
                            font-weight: bold;">
                    Reset Password
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
                </p>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  <strong>This link will expire in 1 hour.</strong>
                </p>
                
                <p style="color: #666; font-size: 14px;">
                  If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                  © 2024 BookHaven. All rights reserved.
                </p>
              </div>
            </body>
          </html>
        `,
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', error)
      return false
    }
    
    console.log('Reset email sent successfully via Resend')
    return true
  } catch (error) {
    console.error('Error sending email via Resend:', error)
    return false
  }
}

Deno.serve(async (req) => {
  console.log('=== Auth Reset Password Request Started ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response('ok', { headers: corsHeaders })
  }

  let body
  try {
    const rawBody = await req.text()
    console.log('Raw body received:', rawBody)
    
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

  // ============================================================================
  // FLOW 1: Request password reset
  // ============================================================================
  if (body.email && !body.token && !body.new_password) {
    console.log('Flow 1: Requesting password reset')
    const { email } = body

    console.log('Email provided:', email)

    if (!isValidEmail(email)) {
      console.error('Validation failed: Invalid email format')
      return new Response(
        JSON.stringify({ error: 'Invalid email format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Checking if user exists...')
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      console.log('User not found (but returning success for security)')
      return new Response(
        JSON.stringify({ message: 'If the email exists, a reset link will be sent.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User found:', userData.id)

    const token = generateSecureToken()
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    console.log('Generated token (first 10 chars):', token.substring(0, 10))
    console.log('Token expires at:', expires_at)

    console.log('Storing reset token...')
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert([{ user_id: userData.id, token, expires_at }])

    if (insertError) {
      console.error('Token storage error:', insertError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create reset token.',
          details: insertError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Reset token stored successfully')

    // Send email - try Resend first, fall back to Supabase
    console.log('Attempting to send reset email...')
    let emailSent = await sendResetEmailViaResend(email, token, userData.full_name)
    
    if (!emailSent) {
      console.log('Resend failed, trying Supabase Auth email...')
      emailSent = await sendResetEmailViaSupabase(supabase, email, token)
    }
    
    if (!emailSent) {
      console.warn('All email methods failed, but token is stored')
      // Still return success for security (don't reveal if email exists)
    } else {
      console.log('Reset email sent successfully')
    }

    console.log('Password reset request completed')
    console.log('=== Auth Reset Password Request Completed ===')

    return new Response(
      JSON.stringify({ message: 'If the email exists, a reset link will be sent.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ============================================================================
  // FLOW 2: Update password with token
  // ============================================================================
  if (body.token && body.new_password) {
    console.log('Flow 2: Updating password with token')
    const { token, new_password } = body

    console.log('Token provided (first 10 chars):', token.substring(0, 10))
    console.log('New password length:', new_password.length)

    if (!isStrongPassword(new_password)) {
      console.error('Validation failed: Weak password')
      return new Response(
        JSON.stringify({ 
          error: 'Password must be at least 8 characters and include at least one letter and one number.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Password validation passed')
    console.log('Verifying reset token...')
    
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      console.error('Token verification failed:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    
    if (expiresAt < now) {
      console.error('Token has expired')
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Token is valid, updating password for user:', tokenData.user_id)

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password: new_password }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update password.',
          details: updateError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Password updated successfully')
    console.log('Deleting used reset token...')
    
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('token', token)

    console.log('Password reset completed successfully')
    console.log('=== Auth Reset Password Request Completed ===')

    return new Response(
      JSON.stringify({ message: 'Password updated successfully.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.error('Invalid request: no valid flow detected')
  console.log('=== Auth Reset Password Request Failed ===')
  
  return new Response(
    JSON.stringify({ error: 'Invalid request. Provide either email (to request reset) or token + new_password (to reset).' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

/*
EMAIL SETUP INSTRUCTIONS:

OPTION 1: Supabase Built-in Email (Easiest - works out of the box)
- Already configured in your Supabase project
- Uses Supabase's email templates
- No additional setup needed
- Set APP_URL in your Edge Function secrets

OPTION 2: Resend (Recommended for production)
1. Sign up at https://resend.com
2. Verify your domain
3. Get your API key
4. Set environment variables in Supabase:
   - RESEND_API_KEY=re_xxxxxxxxxx
   - APP_URL=https://yourdomain.com

To set Edge Function secrets:
supabase secrets set RESEND_API_KEY=your_key_here
supabase secrets set APP_URL=https://yourdomain.com

OPTION 3: Other providers (SendGrid, Mailgun, etc.)
- Follow similar pattern as sendResetEmailViaResend()
- Add your provider's API integration
*/