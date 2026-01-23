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

// Helper: Send password reset email using Resend API (with custom branding)
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
    
    // Generate the actual Supabase password reset link
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${appUrl}/reset-password` // Changed from /auth to /reset-password
      }
    })
    
    if (error || !data?.properties?.action_link) {
      console.error('Failed to generate Supabase reset link:', error)
      return false
    }
    
    const resetLink = data.properties.action_link
    console.log('✅ Supabase reset link generated successfully')
    console.log('🔗 Reset link (first 50 chars):', resetLink.substring(0, 50) + '...')
    
    // Send email via Resend with custom template
    console.log('📧 Sending branded email via Resend to:', email)
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BookHaven <onboarding@resend.dev>', // Change to your verified domain
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

// Helper: Send password reset email using Supabase's built-in email (fallback)
async function sendResetEmailViaSupabase(
  supabase: any,
  email: string
): Promise<boolean> {
  try {
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    
    console.log('📧 Sending password reset via Supabase Auth to:', email)
    console.log('🔗 Redirect URL:', `${appUrl}/reset-password`)
    
    // Use Supabase's native password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`, // Changed from /auth to /reset-password
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
  console.log('=== Auth Reset Password Request Started ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

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

  // ============================================================================
  // Password Reset Flow (using Supabase's native tokens)
  // ============================================================================
  if (body.email) {
    console.log('Password reset requested for email:', body.email)
    const { email } = body

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user exists (optional - for better UX, but reveals if email exists)
    console.log('Checking if user exists...')
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      console.log('User not found (returning success for security)')
      // Still return success to prevent email enumeration
      return new Response(
        JSON.stringify({ message: 'If the email exists, a reset link will be sent.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User found:', userData.id)

    // Try sending email - Resend first (with custom branding), then Supabase fallback
    let emailSent = false
    const resendConfigured = !!Deno.env.get('RESEND_API_KEY')
    
    if (resendConfigured) {
      console.log('📧 RESEND_API_KEY found - using Resend with custom branding')
      emailSent = await sendResetEmailViaResend(supabase, email, userData.full_name)
    } else {
      console.log('📧 RESEND_API_KEY not found - falling back to Supabase Auth email')
    }
    
    // Fallback to Supabase's built-in email if Resend failed or wasn't configured
    if (!emailSent) {
      console.log('📧 Attempting Supabase Auth email (fallback)')
      emailSent = await sendResetEmailViaSupabase(supabase, email)
    }
    
    if (!emailSent) {
      console.error('❌ All email sending methods failed')
      console.error('⚠️ User will not receive reset email')
      console.error('💡 Configure RESEND_API_KEY for custom branded emails')
      console.error('💡 Check Supabase Auth settings if fallback also failed')
    } else {
      console.log('✅ Password reset email sent successfully')
    }

    console.log('=== Auth Reset Password Request Completed ===')

    return new Response(
      JSON.stringify({ message: 'If the email exists, a reset link will be sent.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // If we get here, invalid request
  return new Response(
    JSON.stringify({ error: 'Invalid request. Provide email to request password reset.' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

/*
===================================================================================
PRODUCTION-QUALITY PASSWORD RESET - USING SUPABASE NATIVE TOKENS
===================================================================================

This implementation uses Supabase's built-in password reset tokens (no custom tokens).
The function intelligently chooses between Resend (custom branding) and Supabase email.

EMAIL DELIVERY FLOW:
-------------------
1. Check if RESEND_API_KEY is configured
2. If YES → Use Resend with custom HTML template (better branding)
   - Generates Supabase reset link
   - Sends via Resend with BookHaven branding
3. If NO → Fallback to Supabase's built-in email
   - Uses Supabase's default email templates
   - Still uses Supabase's native tokens

OPTION 1: Resend (Recommended - Custom Branding)
------------------------------------------------
Benefits:
✅ Custom HTML email templates with your branding
✅ Better deliverability
✅ Professional appearance
✅ Still uses Supabase's secure tokens

Setup:
1. Sign up: https://resend.com
2. Get API key
3. Set environment variables:
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx
   supabase secrets set APP_URL=https://intercenbooks.vercel.app

4. For production, verify domain and update line 62:
   from: 'BookHaven <noreply@yourdomain.com>'

OPTION 2: Supabase Email (Works out of the box)
-----------------------------------------------
Benefits:
✅ No additional setup required
✅ Works immediately
✅ Uses Supabase's secure tokens

Setup:
1. Just set APP_URL:
   supabase secrets set APP_URL=https://intercenbooks.vercel.app

2. Optionally customize email template in Supabase Dashboard:
   Authentication → Email Templates → Reset Password

FRONTEND CHANGES REQUIRED:
-------------------------
Your PasswordChange component needs to be updated to handle Supabase's
native recovery flow instead of custom tokens.

The URL will now be:
https://intercenbooks.vercel.app/#access_token=...&type=recovery

Update your route from /reset-password to handle this in /auth page.

CONFIGURATION:
-------------
Required:
- APP_URL: Your application URL

Optional (for custom branding):
- RESEND_API_KEY: For custom branded emails

DEPLOYMENT:
----------
supabase functions deploy auth-reset-password

MONITORING:
----------
Check Function logs to see which email method was used:
- "using Resend with custom branding" = Resend
- "falling back to Supabase Auth email" = Supabase default

SECURITY FEATURES:
-----------------
✅ Uses Supabase's secure token generation
✅ Email enumeration protection
✅ Token expiration handled by Supabase
✅ One-time use tokens
✅ HTTPS-only links
*/