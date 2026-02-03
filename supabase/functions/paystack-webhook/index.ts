// supabase/functions/paystack-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

// Verify Paystack webhook signature
async function verifyPaystackSignature(payload: string, signature: string): Promise<boolean> {
  const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
  
  if (!paystackSecretKey) {
    console.error('Paystack secret key not configured');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(paystackSecretKey);
    const payloadData = encoder.encode(payload);
    
    // Create HMAC SHA512 hash
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('Signature verification:', {
      received: signature,
      computed: computedSignature,
      match: computedSignature === signature,
    });

    return computedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Release reserved stock
// deno-lint-ignore no-explicit-any
async function releaseStock(supabase: any, orderId: string): Promise<void> {
  console.log('Releasing stock for order:', orderId);

  try {
    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('content_id, quantity')
      .eq('order_id', orderId);

    if (itemsError || !orderItems) {
      console.error('Failed to get order items for stock release:', itemsError);
      return;
    }

    console.log('Order items to release:', orderItems.length);

    // Release stock for each item
    for (const orderItem of orderItems) {
      const item = orderItem as { content_id: string; quantity: number };
      
      // Get current stock first
      const { data: contentData, error: fetchError } = await supabase
        .from('content')
        .select('stock_quantity')
        .eq('id', item.content_id)
        .single();

      if (fetchError || !contentData) {
        console.error('Failed to fetch content for stock release:', item.content_id);
        continue;
      }

      const newStock = (contentData as { stock_quantity: number }).stock_quantity + item.quantity;

      const { error: updateError } = await supabase
        .from('content')
        .update({ 
          stock_quantity: newStock,
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('=== Paystack Webhook Received ===');

  try {
    // Get the signature from headers
    const signature = req.headers.get('x-paystack-signature');
    
    if (!signature) {
      console.error('Missing Paystack signature');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    console.log('Webhook payload received, length:', rawBody.length);

    // Verify signature
    const isValid = await verifyPaystackSignature(rawBody, signature);
    
    if (!isValid) {
      console.error('Invalid Paystack signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature verified successfully');

    // Parse the payload
    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    console.log('Webhook event:', event);
    console.log('Transaction reference:', data?.reference);
    console.log('Transaction status:', data?.status);

    // Create Supabase client with service role for webhook operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract order information from metadata or reference
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

    // Find the order
    let orderQuery = supabase.from('orders').select('*');
    
    if (orderId) {
      orderQuery = orderQuery.eq('id', orderId);
    } else if (reference) {
      orderQuery = orderQuery.eq('payment_reference', reference);
    }

    const { data: order, error: orderError } = await orderQuery.single();

    if (orderError || !order) {
      console.error('Order not found:', { orderId, orderNumber, reference, error: orderError });
      // Still return 200 to acknowledge webhook
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

    // Handle different webhook events
    switch (event) {
      case 'charge.success':
        console.log('Processing successful payment...');
        
        // Verify transaction one more time with Paystack API
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
          // Verify amount matches
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

          // Update order to paid
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

          // Call checkout-complete function
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

      case 'charge.failed':
        console.log('Processing failed payment...');
        
        // Update order to failed
        await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        // Release reserved stock
        await releaseStock(supabase, order.id);

        console.log('Order marked as failed and stock released');
        break;

      case 'charge.abandoned':
        console.log('Processing abandoned payment...');
        
        // Update order status
        await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        // Release reserved stock
        await releaseStock(supabase, order.id);

        console.log('Order marked as abandoned and stock released');
        break;

      case 'charge.pending':
        console.log('Payment is pending...');
        
        // Keep status as pending
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

    // Always return 200 to acknowledge webhook
    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const err = error as Error;
    const processingTime = Date.now() - startTime;
    console.error('=== Webhook Processing Failed ===', {
      processingTime: `${processingTime}ms`,
      error: err.message,
      stack: err.stack,
    });
    
    // Still return 200 to acknowledge webhook (prevent retries for invalid data)
    return new Response(
      JSON.stringify({ 
        message: 'Webhook acknowledged but processing failed',
        error: err.message 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
