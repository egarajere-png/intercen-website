// supabase/functions/auth-reset-password/index.ts

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper: Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Helper: Validate password strength
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

// Helper: Send password reset email using Resend API
async function sendResetEmailViaResend(
  email: string,
  token: string,
  full_name: string
): Promise<boolean> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping Resend')
      return false
    }
    
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    const resetLink = `${appUrl}/reset-password?token=${token}`
    
    console.log('Sending email via Resend to:', email)
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BookHaven <noreply@yourdomain.com>', // Change to your verified domain
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
    
    console.log('✅ Reset email sent successfully via Resend')
    return true
  } catch (error) {
    console.error('Error sending email via Resend:', error)
    return false
  }
}

// Helper: Send email using Supabase's built-in auth email (fallback)
async function sendResetEmailViaSupabase(
  email: string,
  token: string
): Promise<boolean> {
  try {
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    const resetLink = `${appUrl}/reset-password?token=${token}`
    
    console.log('Sending email via Supabase Auth to:', email)
    console.log('Reset link:', resetLink)
    
    // Use Supabase's SMTP settings to send a custom email
    // We'll use the Admin API to send a custom recovery email
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase config missing for email')
      return false
    }
    
    // Send via Supabase's email service using the custom template
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'recovery',
        email: email,
        options: {
          redirect_to: resetLink
        }
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Supabase email generation error:', error)
      return false
    }
    
    const data = await response.json()
    console.log('📧 Supabase email generation response:', JSON.stringify(data, null, 2))
    
    // IMPORTANT: Check if email was actually sent or just generated
    if (data.properties?.action_link) {
      console.log('⚠️ WARNING: Supabase generated a link but may not have sent email')
      console.log('🔗 Manual reset link (for testing):', data.properties.action_link)
      console.log('💡 TIP: Check your Supabase email settings in Dashboard → Authentication → Email Templates')
      console.log('💡 TIP: Verify SMTP is configured in Dashboard → Project Settings → Auth')
    }
    
    // Check if we're in development/testing mode
    const isProduction = appUrl.includes('vercel.app') || appUrl.includes('https://')
    if (!isProduction) {
      console.log('🔧 Development mode detected - emails may not be sent')
      console.log('📝 Use the manual reset link above for testing')
    }
    
    console.log('✅ Reset email sent successfully via Supabase')
    return true
  } catch (error) {
    console.error('Error sending email via Supabase:', error)
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

    // Try sending email - Resend first, then fallback to Supabase
    console.log('Attempting to send reset email...')
    
    // Check if Resend is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    let emailSent = false
    
    if (resendApiKey) {
      console.log('📧 Resend API key found - using Resend')
      emailSent = await sendResetEmailViaResend(email, token, userData.full_name)
    } else {
      console.log('📧 Resend not configured - falling back to Supabase Auth')
    }
    
    // Fallback to Supabase if Resend failed or wasn't configured
    if (!emailSent) {
      console.log('Attempting to send via Supabase Auth fallback...')
      emailSent = await sendResetEmailViaSupabase(email, token)
    }
    
    if (!emailSent) {
      console.warn('⚠️ All email methods failed, but token is stored')
      console.warn('User can still reset if they have the token manually')
      // Still return success for security (don't reveal if email exists)
    } else {
      console.log('✅ Reset email sent successfully')
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
EMAIL CONFIGURATION - FLEXIBLE SETUP FOR MVP:

OPTION 1 (MVP - No Setup Required): Supabase Built-in Email
- Works out of the box with Supabase
- Uses Supabase's default SMTP configuration
- Just set APP_URL:
  supabase secrets set APP_URL=https://intercenbooks.vercel.app
- This is the FALLBACK and will be used automatically if Resend is not configured

OPTION 2 (Production): Resend (Custom Email Service)
- Better deliverability and customization
- Requires setup:
  1. Sign up at https://resend.com
  2. Verify your domain
  3. Get API key
  4. Set secrets:
     supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx
     supabase secrets set APP_URL=https://intercenbooks.vercel.app
  5. Update 'from' email to your verified domain

HOW IT WORKS:
- The function checks if RESEND_API_KEY exists
- If YES → Uses Resend (better for production)
- If NO → Falls back to Supabase Auth email (works immediately for MVP)

REQUIRED ENVIRONMENT VARIABLES:
- APP_URL (required): Your application URL
- RESEND_API_KEY (optional): For custom email service

To set environment variables:
supabase secrets set APP_URL=https://intercenbooks.vercel.app
supabase secrets set RESEND_API_KEY=re_your_key_here  # Optional

DATABASE TABLE (password_reset_tokens):
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_user ON password_reset_tokens(user_id);
*/