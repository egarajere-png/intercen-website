// supabase/functions/paystack-verify-payment/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  reference?: string;
  order_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('=== Payment Verification Started ===');

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const body: VerifyRequest = await req.json();
    const { reference, order_id } = body;

    if (!reference && !order_id) {
      return new Response(
        JSON.stringify({ error: 'Payment reference or order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying payment:', { reference, orderId: order_id });

    // Get order
    let order = null;
    if (order_id) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order_id)
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Order lookup error:', error);
      }
      order = data;
    } else if (reference) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_reference', reference)
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Order lookup by reference error:', error);
      }
      order = data;
    }

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order found:', {
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: order.payment_status,
      paymentReference: order.payment_reference,
    });

    const paymentReference = reference || order.payment_reference;

    if (!paymentReference) {
      return new Response(
        JSON.stringify({ 
          error: 'No payment reference found',
          order_id: order.id,
          order_number: order.order_number,
          payment_status: order.payment_status,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify with Paystack
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    
    console.log('Verifying with Paystack API:', paymentReference);
    
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${paymentReference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const verifyData = await verifyResponse.json();

    console.log('Paystack verification response:', {
      status: verifyData.status,
      message: verifyData.message,
      transactionStatus: verifyData.data?.status,
    });

    if (!verifyData.status || !verifyData.data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment verification failed',
          message: verifyData.message,
          order_id: order.id,
          order_number: order.order_number,
          payment_status: order.payment_status,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transaction = verifyData.data;
    const processingTime = Date.now() - startTime;

    console.log('=== Payment Verification Completed ===', {
      processingTime: `${processingTime}ms`,
      transactionStatus: transaction.status,
      orderPaymentStatus: order.payment_status,
    });

    // Return verification result
    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        payment_reference: paymentReference,
        payment_status: order.payment_status,
        order_status: order.status,
        transaction_status: transaction.status,
        amount: transaction.amount / 100, // Convert from kobo
        paid_at: transaction.paid_at,
        transaction_data: {
          channel: transaction.channel,
          currency: transaction.currency,
          ip_address: transaction.ip_address,
          fees: transaction.fees / 100,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('=== Payment Verification Failed ===', {
      processingTime: `${processingTime}ms`,
      error: error.message,
      stack: error.stack,
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});