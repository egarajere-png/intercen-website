// supabase/functions/auth-verify-email/index.ts

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  console.log('=== Auth Verify Email Request Started ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')

  // Validate required params from Supabase confirmation link
  if (!token_hash || !type) {
    console.error('Missing token_hash or type in URL')
    return new Response(
      JSON.stringify({ error: 'Invalid confirmation link.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (type !== 'signup' && type !== 'email') {
    console.error('Unsupported type:', type)
    return new Response(
      JSON.stringify({ error: 'Unsupported verification type.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  console.log(`Processing ${type} confirmation`)
  console.log('Token hash (first 20):', token_hash.substring(0, 20))

  // Initialize Supabase admin client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars')
    return new Response(
      JSON.stringify({ error: 'Server configuration error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Step 1: Verify the token natively with Supabase Auth
  console.log('Verifying token with Supabase Auth...')
  const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as 'signup' | 'email',
  })

  if (verifyError || !authData?.user || !authData?.session) {
    console.error('Verification failed:', verifyError?.message)
    return new Response(
      JSON.stringify({ error: 'Invalid or expired confirmation link.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  console.log('✅ Email confirmed in Supabase Auth')
  console.log('User ID:', authData.user.id)
  console.log('Email:', authData.user.email)

  // Step 2: Update your custom profiles table (if you have is_verified column)
  console.log('Updating profiles table...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_verified, verified_at')
    .eq('id', authData.user.id)
    .single()

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no row
    console.warn('Profile lookup error:', profileError.message)
  }

  if (profile && !profile.is_verified) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', authData.user.id)

    if (updateError) {
      console.warn('Failed to update is_verified:', updateError.message)
    } else {
      console.log('✅ Profile marked as verified')
    }
  } else if (profile?.is_verified) {
    console.log('Profile already verified')
  }

  // Step 3: Optional - Log verification event
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    await supabase.from('audit_logs').insert({
      user_id: authData.user.id,
      action: 'email_verified',
      ip_address: ip,
      metadata: { method: 'native_confirmation' },
    })
    console.log('Audit log recorded')
  } catch (e) {
    console.warn('Audit log failed (optional)')
  }

  // Step 4: FINAL REDIRECT TO PROFILE SETUP PAGE
  const appUrl = Deno.env.get('APP_URL') || 'https://intercenbooks.vercel.app'
  const redirectUrl = `${appUrl}/profile-setup`

  console.log('Redirecting to:', redirectUrl)
  console.log('=== Auth Verify Email Request Completed ===')

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: redirectUrl,
    },
  })
})