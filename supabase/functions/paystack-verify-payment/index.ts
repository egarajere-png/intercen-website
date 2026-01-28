// supabase/functions/paystack-verify/index.ts
// Note: renamed to paystack-verify (shorter, clearer)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { reference } = await req.json();

    if (!reference) {
      return new Response(
        JSON.stringify({ success: false, error: 'Reference is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      console.error('Paystack secret key missing');
      throw new Error('Server configuration error');
    }

    console.log(`Verifying transaction: ${reference}`);

    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Paystack API error: ${res.status}`);
    }

    const data = await res.json();

    if (!data.status || !data.data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data.message || 'Verification failed',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tx = data.data;
    const txStatus = tx.status; // 'success', 'failed', 'abandoned', etc.
    const amount = tx.amount / 100;
    const orderId = tx.metadata?.order_id;

    if (!orderId) {
      console.warn('No order_id in metadata', { reference });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No order linked to this transaction',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client to update order (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    let newPaymentStatus = 'pending';

    if (txStatus === 'success') {
      newPaymentStatus = 'paid';
    } else if (['failed', 'abandoned', 'reversed'].includes(txStatus)) {
      newPaymentStatus = 'failed';
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString(),
        // Optional: store more info
        // payment_details: { channel: tx.channel, paid_at: tx.paid_at },
      })
      .eq('id', orderId)
      .eq('payment_reference', reference);

    if (updateError) {
      console.error('Failed to update order status', updateError);
      // Still return success to user (idempotent), but log
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        payment_status: newPaymentStatus,
        transaction_status: txStatus,
        amount_kes: amount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Verification error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});