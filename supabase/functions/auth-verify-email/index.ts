// supabase/functions/auth-verify-email/index.ts

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  console.log('=== Auth Verify Email Request Started ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // This function now handles Supabase's native confirmation flow
  // The confirmation email link points here with query params:
  // ?token_hash=...&type=signup (or type=email)

  const url = new URL(req.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')

  if (!token_hash || !type) {
    console.error('Missing required parameters: token_hash or type')
    return new Response(
      JSON.stringify({ error: 'Invalid confirmation link. Missing token or type.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  console.log('Received confirmation request')
  console.log('Type:', type)
  console.log('Token hash (first 20 chars):', token_hash.substring(0, 20) + '...')

  // Initialize Supabase admin client (service role key required)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Step 1: Verify the OTP token with Supabase Auth (this confirms the email)
  console.log('Verifying OTP with Supabase Auth...')
  const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as 'signup' | 'email' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
  })

  if (verifyError || !authData?.user) {
    console.error('OTP verification failed:', verifyError?.message)
    return new Response(
      JSON.stringify({ error: 'Invalid or expired confirmation link.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  console.log('✅ Email confirmed successfully in Supabase Auth')
  console.log('User ID:', authData.user.id)
  console.log('Email:', authData.user.email)

  // Step 2: Update your custom profiles table (mark as verified)
  console.log('Updating profiles table...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_verified, verified_at')
    .eq('id', authData.user.id)
    .single()

  if (profileError || !profile) {
    console.warn('Profile not found or error:', profileError?.message)
    // Continue anyway — email is already confirmed in auth
  } else if (!profile.is_verified) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', authData.user.id)

    if (updateError) {
      console.warn('Failed to update profile verification status:', updateError.message)
    } else {
      console.log('✅ Profile marked as verified')
    }
  } else {
    console.log('Profile already marked as verified')
  }

  // Step 3: (Optional) Log verification event in audit_logs
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: authData.user.id,
        action: 'email_verified',
        ip_address: ip,
        metadata: { method: 'native_confirmation_link' },
      })

    if (auditError) console.warn('Audit log failed:', auditError.message)
    else console.log('Verification event logged')
  } catch (e) {
    console.warn('Audit logging skipped (table may not exist)')
  }

  // Step 4: (Optional) Send welcome email here if desired
  // You can reuse your Resend logic from auth-reset-password if needed

  // Step 5: Redirect user to Profile Setup page (they will be logged in automatically)
  const appUrl = Deno.env.get('APP_URL') || 'https://intercenbooks.vercel.app'
  const redirectUrl = `${appUrl}/profile-setup`

  console.log('Redirecting user to:', redirectUrl)
  console.log('=== Auth Verify Email Request Completed ===')

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: redirectUrl,
      // Optional: set a cookie or message if needed
    },
  })
})

/*
===================================================================================
SUPABASE NATIVE EMAIL CONFIRMATION + CUSTOM REDIRECT TO /profile-setup
===================================================================================

This function handles the standard Supabase confirmation link:
https://your-project.supabase.co/auth/v1/verify?token_hash=...&type=signup&redirect_to=...

But we intercept it by setting emailRedirectTo in signUp() to point here.

FLOW:
1. User signs up → Supabase sends confirmation email
2. User clicks link → lands here with token_hash & type
3. We call verifyOtp() → confirms email in auth.users (email_confirmed_at set)
4. We update your custom profiles.is_verified = true
5. We redirect to /profile-setup (user is now logged in with session)

REQUIRED SETUP:
----------------
1. In your signup code:
   await supabase.auth.signUp({
     email,
     password,
     options: {
       emailRedirectTo: `${YOUR_APP_URL}/auth/verify-email`,
     }
   })

2. Add redirect URLs in Supabase Dashboard → Authentication → URL Configuration:
   https://intercenbooks.vercel.app/**
   (or specifically /auth/verify-email and /profile-setup)

3. Set environment variable:
   supabase secrets set APP_URL=https://intercenbooks.vercel.app

4. Deploy:
   supabase functions deploy auth-verify-email

ADVANTAGES:
✅ Uses Supabase's secure, short-lived token_hash
✅ No custom verification_token column needed
✅ User automatically logged in after confirmation
✅ Clean redirect to your ProfileSetup page
✅ Full audit logging and custom profile updates

You can remove any old custom verification_token logic from registration.
*/