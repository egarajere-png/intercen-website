import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/SupabaseClient';
import { Layout } from '@/components/layout/Layout';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your payment...');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const reference = searchParams.get('reference');
    // Paystack sometimes sends trxref (transaction reference) or status
    const trxref = searchParams.get('trxref') || reference;
    const callbackStatus = searchParams.get('status'); // optional: success, failed, etc.

    if (!reference && !trxref) {
      setStatus('error');
      setMessage('Invalid payment callback. No reference found.');
      return;
    }

    const verifyPayment = async () => {
      try {
        // Call your own secure Edge Function to verify the transaction
        // (Recommended: never verify client-side with secret key)
        const { data, error } = await supabase.functions.invoke('paystack-verify', {
          body: { reference: reference || trxref },
        });

        if (error) {
          throw new Error(error.message || 'Verification service error');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Payment verification failed');
        }

        const paymentStatus = data.payment_status;
        const verifiedOrderId = data.order_id;

        if (paymentStatus === 'paid' || paymentStatus === 'success') {
          setStatus('success');
          setMessage('Payment successful! Thank you for your order.');
          setOrderId(verifiedOrderId);
          // Optional: auto-redirect after a few seconds
          setTimeout(() => {
            navigate(`/order-success/${verifiedOrderId}`);
          }, 3000);
        } else {
          setStatus('failed');
          setMessage('Payment was not successful. Please try again.');
          setOrderId(verifiedOrderId);
        }

      } catch (err: any) {
        console.error('Payment verification error:', err);
        setStatus('error');
        setMessage(err.message || 'Something went wrong during verification.');
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  const handleBackToCheckout = () => {
    if (orderId) {
      navigate(`/checkout-payment/${orderId}`);
    } else {
      navigate('/books');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            {/* Back button */}
            <div className="mb-6 text-left">
              <button
                onClick={handleBackToCheckout}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Checkout
              </button>
            </div>

            {/* Status content */}
            {status === 'loading' && (
              <div className="py-12">
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" />
                <h2 className="text-2xl font-semibold mb-3">Verifying Payment</h2>
                <p className="text-muted-foreground">
                  Please wait while we confirm your payment with Paystack...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="py-12">
                <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-green-800 mb-3">Payment Successful!</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Thank you for your order. We're processing it now.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  You will be redirected to your order confirmation shortly...
                </p>
                <button
                  onClick={() => navigate(`/order-success/${orderId}`)}
                  className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition"
                >
                  View Order Details
                </button>
              </div>
            )}

            {status === 'failed' && (
              <div className="py-12">
                <XCircle className="h-20 w-20 text-red-600 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-red-800 mb-3">Payment Failed</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Your payment could not be completed at this time.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800">
                      No charges were made to your account. Please try again or choose another payment method.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleBackToCheckout}
                  className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition"
                >
                  Try Again
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="py-12">
                <AlertCircle className="h-20 w-20 text-amber-600 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-amber-800 mb-3">Something Went Wrong</h2>
                <p className="text-lg text-muted-foreground mb-8">{message}</p>
                <button
                  onClick={() => navigate('/books')}
                  className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition"
                >
                  Continue Shopping
                </button>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-8">
              Secure payment processed by Paystack • All transactions are encrypted
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentCallback;