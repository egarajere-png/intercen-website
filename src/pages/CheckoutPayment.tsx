import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingBag, CheckCircle, CreditCard, Package,
  Loader2, AlertCircle, ArrowLeft, Smartphone, ChevronRight
} from "lucide-react";
import { supabase } from '../lib/SupabaseClient';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/components/Seo';

interface OrderDetails {
  id: string;
  order_number: string;
  user_id: string;
  total_price: number;
  sub_total: number;
  tax: number;
  shipping: number;
  discount: number;
  status: string;
  payment_status: string;
  shipping_address: string;
  billing_address: string;
  payment_method: string | null;
  created_at: string;
  order_items?: Array<{
    id: string;
    content_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    content: {
      title: string;
      author: string;
      cover_image_url: string;
    };
  }>;
}

type PaymentMethod = 'mpesa' | 'paystack' | null;

const CheckoutPayment = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(null);

  // M-Pesa specific state
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaStep, setMpesaStep] = useState<'idle' | 'prompt_sent' | 'confirming'>('idle');
  const [pollTimeoutReached, setPollTimeoutReached] = useState(false);

  // Refs to clear intervals/timeouts on unmount
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);

  useEffect(() => {
    checkUser();
    if (orderId) fetchOrderDetails();
  }, [orderId]);

  // ── Polling: watch for M-Pesa payment confirmation ────────────────────────
  useEffect(() => {
    if (mpesaStep !== 'prompt_sent' || !orderId) return;

    setPollTimeoutReached(false);

    // Poll every 4 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('payment_status, order_number')
          .eq('id', orderId)
          .single();

        if (data?.payment_status === 'paid') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (pollTimeoutRef.current)  clearTimeout(pollTimeoutRef.current);
          navigate(
            `/payment-success?order_id=${orderId}&order_number=${data.order_number}`
          );
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 4000);

    // Stop polling after 2 minutes and show a timeout message
    pollTimeoutRef.current = setTimeout(() => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setPollTimeoutReached(true);
    }, 120_000);

    // Cleanup on unmount or when mpesaStep changes
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pollTimeoutRef.current)  clearTimeout(pollTimeoutRef.current);
    };
  }, [mpesaStep, orderId]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (!user) navigate('/auth');
  };

  // ── Fetch order ───────────────────────────────────────────────────────────
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Please log in to continue');

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            content_id,
            quantity,
            unit_price,
            total_price,
            content:content_id (
              title,
              author,
              cover_image_url
            )
          )
        `)
        .eq('id', orderId)
        .eq('user_id', session.user.id)
        .single();

      if (orderError || !orderData) throw new Error('Order not found');

      setOrder(orderData);

      if (orderData.payment_status === 'paid') {
        navigate(`/payment-success?order_id=${orderId}&order_number=${orderData.order_number}`);
      }
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  // ── Paystack ──────────────────────────────────────────────────────────────
  const handlePaystackPayment = async () => {
    if (!order || !user) return;
    try {
      setProcessing(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Session expired. Please log in again.');

      const { data, error } = await supabase.functions.invoke('checkout-process-payment', {
        body: { order_id: order.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message || 'Payment initialization failed');
      if (!data?.success) throw new Error(data?.error || 'Payment initialization failed');

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error('Payment URL not received');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
      setProcessing(false);
    }
  };

  // ── M-Pesa ────────────────────────────────────────────────────────────────
  const handleMpesaPayment = async () => {
    if (!order || !user || !mpesaPhone.trim()) return;
    try {
      setProcessing(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Session expired. Please log in again.');

      const { data, error } = await supabase.functions.invoke('checkout-mpesa-stk-push', {
        body: {
          order_id:     order.id,
          phone_number: mpesaPhone.trim(),
          amount:       order.total_price,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message || 'M-Pesa request failed');
      if (!data?.success) throw new Error(data?.error || 'M-Pesa STK push failed');

      setMpesaStep('prompt_sent'); // ← triggers the polling useEffect
    } catch (err: any) {
      setError(err.message || 'Failed to initiate M-Pesa payment');
    } finally {
      setProcessing(false);
    }
  };

  // ── Dispatch ──────────────────────────────────────────────────────────────
  const handlePay = () => {
    if (selectedPaymentMethod === 'paystack') return handlePaystackPayment();
    if (selectedPaymentMethod === 'mpesa')    return handleMpesaPayment();
  };

  // Allow user to retry after timeout
  const handleRetryMpesa = () => {
    setPollTimeoutReached(false);
    setMpesaStep('idle');
    setError(null);
  };

  // ── Loading / Error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading order details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !order) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <button
                onClick={() => navigate('/books')}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <Seo
        title="Checkout Payment | Intercen Books"
        description="Complete your order payment securely on Intercen Books. Choose your preferred payment method and finalize your purchase."
        canonical="https://www.intercenbooks.com/checkout/payment"
      />

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/books')}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Shopping
            </button>
            <h1 className="font-serif text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              Complete Your Payment
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left Column ───────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Order Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Order Details</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Number:</span>
                    <span className="font-mono font-semibold">{order.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Date:</span>
                    <span className="font-medium">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium capitalize">{order.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Status:</span>
                    <span className={`font-medium capitalize ${
                      order.payment_status === 'paid'    ? 'text-green-600' :
                      order.payment_status === 'pending' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {order.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              {order.order_items && order.order_items.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold">Order Items</h2>
                  </div>
                  <div className="divide-y">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="p-6 flex gap-4">
                        <img
                          src={item.content.cover_image_url || '/placeholder-book.png'}
                          alt={item.content.title}
                          className="w-20 h-28 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{item.content.title}</h3>
                          <p className="text-muted-foreground text-sm mt-1">
                            by {item.content.author}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <p className="text-muted-foreground text-sm">Qty: {item.quantity}</p>
                            <p className="text-primary font-semibold">
                              KES {item.unit_price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">KES {item.total_price.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
                <p className="text-muted-foreground">{order.shipping_address}</p>
              </div>

              {/* Payment Method Selection */}
              {order.payment_status !== 'paid' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-4">Choose Payment Method</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* M-Pesa card */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaymentMethod('mpesa');
                        setError(null);
                        setMpesaStep('idle');
                        setPollTimeoutReached(false);
                      }}
                      className={`relative flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all focus:outline-none ${
                        selectedPaymentMethod === 'mpesa'
                          ? 'border-green-500 bg-green-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">M-Pesa</p>
                          <p className="text-xs text-muted-foreground">Safaricom Daraja</p>
                        </div>
                      </div>
                      {selectedPaymentMethod === 'mpesa' && (
                        <CheckCircle className="absolute top-3 right-3 h-5 w-5 text-green-500" />
                      )}
                    </button>

                    {/* Paystack card */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaymentMethod('paystack');
                        setError(null);
                        setMpesaStep('idle');
                        setPollTimeoutReached(false);
                      }}
                      className={`relative flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all focus:outline-none ${
                        selectedPaymentMethod === 'paystack'
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Paystack</p>
                          <p className="text-xs text-muted-foreground">Card / Bank Transfer</p>
                        </div>
                      </div>
                      {selectedPaymentMethod === 'paystack' && (
                        <CheckCircle className="absolute top-3 right-3 h-5 w-5 text-blue-500" />
                      )}
                    </button>
                  </div>

                  {/* Phone input */}
                  {selectedPaymentMethod === 'mpesa' && mpesaStep === 'idle' && (
                    <div className="mt-5 space-y-2">
                      <label htmlFor="mpesa-phone" className="block text-sm font-medium text-gray-700">
                        M-Pesa Phone Number
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="flex h-10 items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                          +254
                        </span>
                        <input
                          id="mpesa-phone"
                          type="tel"
                          placeholder="7XXXXXXXX"
                          value={mpesaPhone}
                          onChange={(e) =>
                            setMpesaPhone(e.target.value.replace(/\D/g, '').slice(0, 9))
                          }
                          className="flex-1 h-10 rounded-r-lg border border-gray-300 px-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter the number registered on your M-Pesa account.
                      </p>
                    </div>
                  )}

                  {/* STK sent — polling active */}
                  {selectedPaymentMethod === 'mpesa' && mpesaStep === 'prompt_sent' && !pollTimeoutReached && (
                    <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3">
                      <Smartphone className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-green-800">STK Push Sent!</p>
                        <p className="text-sm text-green-700 mt-1">
                          Check your phone (+254 {mpesaPhone}) for the M-Pesa prompt and enter your PIN.
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                          <p className="text-xs text-green-600">Waiting for confirmation...</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Polling timed out */}
                  {selectedPaymentMethod === 'mpesa' && pollTimeoutReached && (
                    <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex items-start gap-3">
                      <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-yellow-800">Payment not confirmed yet</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          We didn't receive a confirmation. If you completed the payment, it may still be processing.
                        </p>
                        <button
                          onClick={handleRetryMpesa}
                          className="mt-3 text-sm font-semibold text-yellow-800 underline hover:text-yellow-900"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Right Column – Payment Summary ────────────────────────── */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">KES {order.sub_total.toLocaleString()}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">-KES {order.discount.toLocaleString()}</span>
                    </div>
                  )}
                  {order.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">KES {order.tax.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">
                      {order.shipping === 0 ? 'FREE' : `KES ${order.shipping.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">KES {order.total_price.toLocaleString()}</span>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Pay button — hidden while waiting for M-Pesa confirmation */}
                {order.payment_status !== 'paid' && mpesaStep === 'idle' && (
                  <button
                    onClick={handlePay}
                    disabled={
                      processing ||
                      !selectedPaymentMethod ||
                      (selectedPaymentMethod === 'mpesa' && mpesaPhone.length < 9)
                    }
                    className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 text-white
                      ${selectedPaymentMethod === 'mpesa'
                        ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-300'
                        : selectedPaymentMethod === 'paystack'
                        ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300'
                        : 'bg-gray-300 cursor-not-allowed'}
                      disabled:cursor-not-allowed`}
                  >
                    {processing ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                    ) : !selectedPaymentMethod ? (
                      <><ChevronRight className="h-5 w-5" /> Select a Payment Method</>
                    ) : selectedPaymentMethod === 'mpesa' ? (
                      <><Smartphone className="h-5 w-5" /> Pay with M-Pesa</>
                    ) : (
                      <><CreditCard className="h-5 w-5" /> Pay with Paystack</>
                    )}
                  </button>
                )}

                {order.payment_status === 'paid' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-green-800 font-medium">Payment Completed</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPayment;