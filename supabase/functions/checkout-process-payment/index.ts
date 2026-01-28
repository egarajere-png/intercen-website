// supabase/functions/checkout-process-payment/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";   // ← FIXED HERE

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  order_id: string;
}

interface OrderDetails {
  id: string;
  order_number: string;
  user_id: string;
  total_price: number;
  status: string;
  payment_status: string;
  sub_total: number;
  tax: number;
  shipping: number;
  discount: number;
}

// Initialize Paystack payment
async function initiatePaystackPayment(
  email: string,
  amount: number,
  orderId: string,
  orderNumber: string,
  metadata: any
): Promise<{ success: boolean; authorization_url?: string; access_code?: string; reference?: string; error?: string }> {
  try {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key is not configured');
    }

    console.log('Initiating Paystack payment:', {
      email,
      amount: amount * 100,
      orderId,
      orderNumber,
    });

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        amount: Math.round(amount * 100),
        currency: 'KES',
        reference: `${orderNumber}-${Date.now()}`,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paystack-callback`,
        metadata: {
          order_id: orderId,
          order_number: orderNumber,
          custom_fields: [
            {
              display_name: "Order Number",
              variable_name: "order_number",
              value: orderNumber
            },
            {
              display_name: "Order ID",
              variable_name: "order_id",
              value: orderId
            }
          ],
          ...metadata
        },
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      }),
    });

    const data = await response.json();

    console.log('Paystack initialization response:', {
      status: data.status,
      message: data.message,
      hasData: !!data.data,
    });

    if (data.status && data.data) {
      return {
        success: true,
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference,
      };
    } else {
      return {
        success: false,
        error: data.message || 'Failed to initialize Paystack payment',
      };
    }
  } catch (error) {
    console.error('Paystack payment initialization error:', error);
    return {
      success: false,
      error: (error as Error).message || 'Paystack payment initialization failed',
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('=== Payment Processing Started ===');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '').trim();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Authentication failed:', userError?.message ?? 'No user returned');
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', { userId: user.id, email: user.email });

    let body: PaymentRequest;
    try {
      body = await req.json();
    } catch {
      throw new Error('Invalid JSON body');
    }

    const { order_id } = body;

    if (!order_id) {
      throw new Error('Order ID is required');
    }

    console.log('Processing payment for order:', order_id);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      console.error('Order fetch failed:', orderError);
      throw new Error('Order not found or access denied');
    }

    if (order.payment_status === 'paid') {
      return new Response(
        JSON.stringify({ 
          error: 'Order is already paid',
          order_id: order.id,
          order_number: order.order_number,
          payment_status: 'paid'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Order is cancelled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metadata = {
      user_id: user.id,
      user_email: user.email,
      subtotal: order.sub_total,
      tax: order.tax,
      shipping: order.shipping,
      discount: order.discount,
    };

    const paystackResult = await initiatePaystackPayment(
      user.email || '',
      order.total_price,
      order.id,
      order.order_number,
      metadata
    );

    if (!paystackResult.success) {
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment initialization failed',
          details: paystackResult.error,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_reference: paystackResult.reference,
        payment_method: 'paystack',
        payment_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    if (updateError) {
      console.error('Failed to save payment reference:', updateError);
    }

    const processingTime = Date.now() - startTime;

    console.log('=== Payment Processing Completed ===', {
      processingTime: `${processingTime}ms`,
      success: true,
      reference: paystackResult.reference,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment initialized successfully',
        order_id: order.id,
        order_number: order.order_number,
        payment_reference: paystackResult.reference,
        authorization_url: paystackResult.authorization_url,
        access_code: paystackResult.access_code,
        payment_status: 'pending',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('=== Payment Processing Failed ===', {
      processingTime: `${processingTime}ms`,
      error: error.message,
      stack: error.stack,
    });

    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});