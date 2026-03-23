// supabase/functions/paystack-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

function verifyPaystackSignature(payload: string, signature: string): boolean {
  const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
  
  if (!paystackSecretKey) {
    console.error('Paystack secret key not configured');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(paystackSecretKey);
    const payloadData = encoder.encode(payload);
    
    const key = crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );

    return key.then(async (cryptoKey) => {
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
      const hashArray = Array.from(new Uint8Array(signatureBuffer));
      const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log('Signature verification:', {
        received: signature,
        computed: computedSignature,
        match: computedSignature === signature,
      });

      return computedSignature === signature;
    });
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

async function releaseStock(supabase: ReturnType<typeof createClient>, orderId: string): Promise<void> {
  console.log('Releasing stock for order:', orderId);

  try {
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('content_id, quantity')
      .eq('order_id', orderId);

    if (itemsError || !orderItems) {
      console.error('Failed to get order items for stock release:', itemsError);
      return;
    }

    console.log('Order items to release:', orderItems.length);

    for (const item of orderItems) {
      const { error: updateError } = await supabase
        .from('content')
        .update({ 
          stock_quantity: supabase.raw(`stock_quantity + ${item.quantity}`),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.content_id);

      if (updateError) {
        console.error('Failed to release stock for content:', item.content_id, updateError);
      } else {
        console.log('Stock released for content:', item.content_id, 'quantity:', item.quantity);
      }
    }

    console.log('Stock release completed for order:', orderId);
  } catch (error) {
    console.error('Stock release error:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('=== Paystack Webhook Received ===');

  try {
    const signature = req.headers.get('x-paystack-signature');
    
    if (!signature) {
      console.error('Missing Paystack signature');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.text();
    console.log('Webhook payload received, length:', rawBody.length);

    const isValid = await verifyPaystackSignature(rawBody, signature);
    
    if (!isValid) {
      console.error('Invalid Paystack signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature verified successfully');

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    console.log('Webhook event:', event);
    console.log('Transaction reference:', data?.reference);
    console.log('Transaction status:', data?.status);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const orderId = data?.metadata?.order_id;
    const orderNumber = data?.metadata?.order_number;
    const reference = data?.reference;

    if (!orderId && !orderNumber && !reference) {
      console.error('No order identification found in webhook data');
      return new Response(
        JSON.stringify({ error: 'No order identification found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let orderQuery = supabase.from('orders').select('*');
    
    if (orderId) {
      orderQuery = orderQuery.eq('id', orderId);
    } else if (reference) {
      orderQuery = orderQuery.eq('payment_reference', reference);
    }

    const { data: order, error: orderError } = await orderQuery.single();

    if (orderError || !order) {
      console.error('Order not found:', { orderId, orderNumber, reference, error: orderError });
      return new Response(
        JSON.stringify({ 
          message: 'Order not found but webhook acknowledged',
          orderId,
          orderNumber,
          reference
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order found:', {
      orderId: order.id,
      orderNumber: order.order_number,
      currentStatus: order.status,
      currentPaymentStatus: order.payment_status,
    });

    switch (event) {
      case 'charge.success': {
        console.log('Processing successful payment...');
        
        const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
        const verifyResponse = await fetch(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${paystackSecretKey}`,
            },
          }
        );

        const verifyData = await verifyResponse.json();
        console.log('Paystack verification response:', {
          status: verifyData.status,
          transactionStatus: verifyData.data?.status,
          amount: verifyData.data?.amount,
        });

        if (verifyData.status && verifyData.data?.status === 'success') {
          const expectedAmount = Math.round(order.total_price * 100);
          const paidAmount = verifyData.data.amount;

          if (paidAmount !== expectedAmount) {
            console.error('Amount mismatch:', { expected: expectedAmount, paid: paidAmount });
            
            await supabase
              .from('orders')
              .update({
                payment_status: 'failed',
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', order.id);

            await releaseStock(supabase, order.id);

            return new Response(
              JSON.stringify({ message: 'Amount mismatch - order cancelled' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_status: 'paid',
              status: 'processing',
              payment_reference: reference,
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (updateError) {
            console.error('Failed to update order status:', updateError);
          } else {
            console.log('Order updated to paid status');
          }

          console.log('Calling checkout-complete function...');
          try {
            const { data: completeData, error: completeError } = await supabase.functions.invoke(
              'checkout-complete',
              {
                body: { order_id: order.id }
              }
            );

            if (completeError) {
              console.error('checkout-complete function error:', completeError);
            } else {
              console.log('checkout-complete function success:', completeData);
            }
          } catch (completeError) {
            console.error('Failed to invoke checkout-complete:', completeError);
          }
        } else {
          console.warn('Payment verification failed:', verifyData);
        }
        break;
      }

      case 'charge.failed':
        console.log('Processing failed payment...');
        
        await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        await releaseStock(supabase, order.id);

        console.log('Order marked as failed and stock released');
        break;

      case 'charge.abandoned':
        console.log('Processing abandoned payment...');
        
        await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        await releaseStock(supabase, order.id);

        console.log('Order marked as abandoned and stock released');
        break;

      case 'charge.pending':
        console.log('Payment is pending...');
        
        await supabase
          .from('orders')
          .update({
            payment_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    const processingTime = Date.now() - startTime;
    console.log('=== Webhook Processing Completed ===', {
      processingTime: `${processingTime}ms`,
      event,
      orderId: order.id,
    });

    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('=== Webhook Processing Failed ===', {
      processingTime: `${processingTime}ms`,
      error: error.message,
      stack: error.stack,
    });
    
    return new Response(
      JSON.stringify({ 
        message: 'Webhook acknowledged but processing failed',
        error: error.message 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});