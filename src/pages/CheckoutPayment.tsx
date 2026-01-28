import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, CheckCircle, CreditCard, Package, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { supabase } from '../lib/SupabaseClient';
import { Layout } from '@/components/layout/Layout';

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

const CheckoutPayment = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (!user) {
      navigate('/auth');
    }
  };

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Please log in to continue');
      }

      // Fetch order with items
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

      if (orderError) {
        throw new Error('Order not found');
      }

      if (!orderData) {
        throw new Error('Order not found');
      }

      setOrder(orderData);

      // If already paid, redirect to success page
      if (orderData.payment_status === 'paid') {
        navigate(`/order-success/${orderId}`);
      }

    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!order || !user) return;

    try {
      setProcessing(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Session expired. Please log in again.');
      }

      console.log('Initiating payment for order:', order.id);

      // Call checkout-process-payment edge function
      const { data, error } = await supabase.functions.invoke('checkout-process-payment', {
        body: { order_id: order.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Payment error:', error);
        throw new Error(error.message || 'Payment initialization failed');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Payment initialization failed');
      }

      console.log('Payment initialized:', data);

      // Redirect to Paystack payment page
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error('Payment URL not received');
      }

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to process payment');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
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

  if (!order) {
    return null;
  }

  return (
    <Layout>
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
            {/* Left Column - Order Details */}
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
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
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
                      order.payment_status === 'paid' ? 'text-green-600' :
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
                          <p className="text-muted-foreground text-sm mt-1">by {item.content.author}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <p className="text-muted-foreground text-sm">Qty: {item.quantity}</p>
                            <p className="text-primary font-semibold">
                              KES {item.unit_price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-semibold">
                            KES {item.total_price.toLocaleString()}
                          </p>
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
            </div>

            {/* Right Column - Payment Summary */}
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

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Payment Button */}
                {order.payment_status !== 'paid' && (
                  <button
                    onClick={handlePayment}
                    disabled={processing}
                    className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        PAY
                      </>
                    )}
                  </button>
                )}

                {order.payment_status === 'paid' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-green-800 font-medium">Payment Completed</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Secure payment powered by Paystack
                </p>

                {/* Payment Methods */}
                {/* <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-muted-foreground text-center mb-3">
                    We accept
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <div className="px-3 py-2 bg-gray-50 rounded border text-xs font-medium">
                      Card
                    </div>
                    <div className="px-3 py-2 bg-gray-50 rounded border text-xs font-medium">
                      Bank Transfer
                    </div>
                    <div className="px-3 py-2 bg-gray-50 rounded border text-xs font-medium">
                      USSD
                    </div>
                    <div className="px-3 py-2 bg-gray-50 rounded border text-xs font-medium">
                      Mobile Money
                    </div>
                  </div>
                </div> */}
              </div>
            </div>
          </div>

          {/* Security Notice */}
          {/* <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4"> */}
            {/* <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Secure Payment</h3>
                <p className="text-sm text-blue-800">
                  Your payment information is encrypted and secure. We never store your card details.
                  All transactions are processed through Paystack's secure payment gateway.
                </p>
              </div>
            </div> */}
          {/* </div> */}
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPayment;