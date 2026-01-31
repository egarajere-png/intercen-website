// supabase/functions/paystack-callback/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== Paystack Callback Received ===');

  try {
    // Get query parameters from URL
    const url = new URL(req.url);
    const reference = url.searchParams.get('reference');
    const trxref = url.searchParams.get('trxref'); // Alternative parameter name

    const transactionReference = reference || trxref;

    console.log('Callback parameters:', {
      reference,
      trxref,
      transactionReference,
    });

    if (!transactionReference) {
      console.error('No transaction reference found in callback');
      
      // Redirect to frontend error page
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
      return Response.redirect(
        `${frontendUrl}/checkout/payment-failed?error=no_reference`,
        302
      );
    }

    // Verify transaction with Paystack
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    
    console.log('Verifying transaction with Paystack:', transactionReference);
    
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${transactionReference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const verifyData = await verifyResponse.json();

    console.log('Paystack verification result:', {
      status: verifyData.status,
      message: verifyData.message,
      transactionStatus: verifyData.data?.status,
      amount: verifyData.data?.amount,
    });

    if (!verifyData.status || !verifyData.data) {
      console.error('Transaction verification failed:', verifyData.message);
      
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
      return Response.redirect(
        `${frontendUrl}/checkout/payment-failed?error=verification_failed&reference=${transactionReference}`,
        302
      );
    }

    const transaction = verifyData.data;
    const orderId = transaction.metadata?.order_id;
    const orderNumber = transaction.metadata?.order_number;

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find order
    let order = null;
    if (orderId) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      order = data;
    } else if (transactionReference) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_reference', transactionReference)
        .single();
      order = data;
    }

    if (!order) {
      console.error('Order not found:', { orderId, orderNumber, reference: transactionReference });
      
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
      return Response.redirect(
        `${frontendUrl}/checkout/payment-failed?error=order_not_found&reference=${transactionReference}`,
        302
      );
    }

    console.log('Order found:', {
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: order.payment_status,
      status: order.status,
    });

    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';

    // Handle based on transaction status
    switch (transaction.status) {
      case 'success':
        console.log('Payment successful - redirecting to success page');
        return Response.redirect(
          `${frontendUrl}/checkout/payment-success?order_id=${order.id}&order_number=${order.order_number}&reference=${transactionReference}`,
          302
        );

      case 'failed':
        console.log('Payment failed - redirecting to failure page');
        return Response.redirect(
          `${frontendUrl}/checkout/payment-failed?order_id=${order.id}&order_number=${order.order_number}&reference=${transactionReference}&reason=payment_failed`,
          302
        );

      case 'abandoned':
        console.log('Payment abandoned - redirecting to cancelled page');
        return Response.redirect(
          `${frontendUrl}/checkout/payment-cancelled?order_id=${order.id}&order_number=${order.order_number}&reference=${transactionReference}`,
          302
        );

      case 'pending':
        console.log('Payment pending - redirecting to pending page');
        return Response.redirect(
          `${frontendUrl}/checkout/payment-pending?order_id=${order.id}&order_number=${order.order_number}&reference=${transactionReference}`,
          302
        );

      default:
        console.warn('Unknown payment status:', transaction.status);
        return Response.redirect(
          `${frontendUrl}/checkout/payment-status?order_id=${order.id}&status=${transaction.status}&reference=${transactionReference}`,
          302
        );
    }

  } catch (error: unknown) {
    const err = error as Error;
    console.error('=== Callback Processing Failed ===', {
      error: err.message,
      stack: err.stack,
    });
    
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
    return Response.redirect(
      `${frontendUrl}/checkout/payment-failed?error=callback_error`,
      302
    );
  }
});
