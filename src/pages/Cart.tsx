import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag, Plus, Minus, Trash2,
  User, MapPin, Truck, Package, CheckCircle
} from "lucide-react";
import { supabase } from '../lib/SupabaseClient';
import { Layout } from '@/components/layout/Layout';

// ── Types ─────────────────────────────────────────────────────────────────
interface CartItem {
  id: string;
  content_id: string;
  quantity: number;
  price: number;
  content: {
    id: string;
    title: string;
    author: string;
    cover_image_url: string;
    stock_quantity: number;
    is_for_sale: boolean;
    status: string;
  };
}

interface DeliveryMethod {
  id: string;
  name: string;
  cost: number;
  estimatedDays: string;
  description: string;
}

// ── Constants ─────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://nnljrawwhibazudjudht.supabase.co';

const DELIVERY_METHODS: DeliveryMethod[] = [
  {
    id: 'standard',
    name: 'Standard Delivery',
    cost: 500,
    estimatedDays: '1-3 business days',
    description: 'Regular delivery within city'
  },
  {
    id: 'express',
    name: 'Express Delivery',
    cost: 200,
    estimatedDays: '1-2 business days',
    description: 'Fast delivery within city'
  },
  {
    id: 'pickup',
    name: 'Store Pickup',
    cost: 0,
    estimatedDays: 'Same day',
    description: 'Pick up from our store location'
  }
];

// ── Component ─────────────────────────────────────────────────────────────
const Cart = () => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);

  // Customer Info
  const [customerInfo, setCustomerInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
  });

  // Shipping Address
  const [shippingAddress, setShippingAddress] = useState({
    address: '',
    city: '',
    postalCode: '',
  });

  // Delivery
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryMethod | null>(null);
  const [deliveryReviewed, setDeliveryReviewed] = useState(false);

  // Discount
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    type: 'percentage' | 'fixed';
  } | null>(null);

  // Order Confirmation
  const [orderConfirmation, setOrderConfirmation] = useState<{
    open: boolean;
    orderNumber?: string;
    orderId?: string;
  }>({ open: false });

  // ── Fetch cart via Edge Function ──────────────────────────────────────
  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Not logged in — clear cart display but don't wipe stored data
        setCartItems([]);
        setCartId(null);
        setUser(null);
        return;
      }

      setUser(session.user);
      setCustomerInfo(prev => ({
        ...prev,
        email: prev.email || session.user.email || ''
      }));

      // Call the cart-get Edge Function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/cart-get`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Cart fetch failed:', errorData);
        setCartItems([]);
        return;
      }

      const data = await response.json();
      console.log('Cart data received:', data);

      setCartId(data.cart?.id ?? null);
      setCartItems(data.items ?? []);

    } catch (error) {
      console.error('Error fetching cart:', error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── On mount: fetch cart + listen to auth changes ─────────────────────
  useEffect(() => {
    fetchCart();

    // Re-fetch when user signs in; preserve cart across refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          setCustomerInfo(prev => ({
            ...prev,
            email: prev.email || session.user.email || ''
          }));
          await fetchCart();
        } else if (event === 'SIGNED_OUT') {
          setCartItems([]);
          setCartId(null);
          setUser(null);
        }
        // TOKEN_REFRESHED — silently re-fetch to ensure fresh token is used
        if (event === 'TOKEN_REFRESHED' && session) {
          await fetchCart();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCart]);

  // ── Update quantity (direct DB for optimistic UX) ─────────────────────
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    // Optimistic update
    setCartItems(prev =>
      prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item)
    );

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating quantity:', error);
      await fetchCart(); // revert on failure
    }
  };

  // ── Remove item ───────────────────────────────────────────────────────
  const removeItem = async (itemId: string) => {
    // Optimistic update
    setCartItems(prev => prev.filter(item => item.id !== itemId));

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing item:', error);
      await fetchCart(); // revert on failure
    }
  };

  // ── Apply discount ────────────────────────────────────────────────────
  const applyDiscount = () => {
    if (discountCode.toUpperCase() === 'SAVE10') {
      setAppliedDiscount({ code: 'SAVE10', amount: 10, type: 'percentage' });
    } else {
      alert('Invalid discount code');
    }
  };

  // ── Checkout ──────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!user) {
      alert('Please log in to checkout');
      navigate('/auth');
      return;
    }
    if (!customerInfo.fullName || !customerInfo.phone) {
      alert('Please fill in all customer information');
      return;
    }
    if (!shippingAddress.address || !shippingAddress.city) {
      alert('Please provide a shipping address');
      return;
    }
    if (!selectedDelivery) {
      alert('Please select a delivery method');
      return;
    }
    if (!deliveryReviewed) {
      alert('Please review and confirm delivery details');
      return;
    }

    try {
      setIsProcessing(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        alert('Session expired. Please log in again.');
        navigate('/auth');
        return;
      }

      const checkoutData = {
        customer_info: {
          fullName: customerInfo.fullName,
          email: customerInfo.email || session.user.email,
          phone: customerInfo.phone,
        },
        shipping_address: {
          address: shippingAddress.address,
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode,
        },
        delivery_method: selectedDelivery,
        discount_code: appliedDiscount?.code || undefined,
      };

      const { data, error } = await supabase.functions.invoke('checkout-initiate', {
        body: checkoutData,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        alert(error.message || 'Failed to initiate checkout');
        return;
      }
      if (!data?.success) {
        alert(data?.error || 'Checkout failed');
        return;
      }

      setOrderConfirmation({
        open: true,
        orderNumber: data.order_number,
        orderId: data.order_id
      });

    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(error.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Computed totals ───────────────────────────────────────────────────
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === 'percentage'
      ? (subtotal * appliedDiscount.amount) / 100
      : appliedDiscount.amount
    : 0;
  const deliveryCost = selectedDelivery?.cost ?? 0;
  const total = subtotal - discountAmount + deliveryCost;

  // ── Order Confirmation Modal ──────────────────────────────────────────
  const OrderConfirmationModal = () => (
    orderConfirmation.open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center relative">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
          <p className="mb-4">Your order was created successfully.</p>
          <p className="mb-4 font-semibold">
            Order Number: <span className="text-primary">{orderConfirmation.orderNumber}</span>
          </p>
          <button
            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 w-full"
            onClick={() => {
              setOrderConfirmation({ open: false });
              if (orderConfirmation.orderId) {
                navigate(`/checkout/payment/${orderConfirmation.orderId}`);
              }
            }}
          >
            Proceed to Payment
          </button>
        </div>
      </div>
    ) : null
  );

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p>Loading cart...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Layout>
      <OrderConfirmationModal />

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Shopping Cart</h1>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">Add some items to get started!</p>
              <Link
                to="/books"
                className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition"
              >
                Browse Books
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* ── Left Column ── */}
              <div className="lg:col-span-2 space-y-6">

                {/* Cart Items */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Cart Items ({cartItems.length})
                  </h2>
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4 border-b pb-4 last:border-b-0">
                        <img
                          src={item.content?.cover_image_url || '/placeholder-book.png'}
                          alt={item.content?.title || 'Book'}
                          className="w-20 h-28 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-book.png';
                          }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.content?.title}</h3>
                          <p className="text-sm text-gray-600">{item.content?.author}</p>
                          <p className="text-primary font-semibold mt-1">
                            KSh {item.price.toLocaleString()}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 rounded hover:bg-gray-100"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-3 py-1 border rounded">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 rounded hover:bg-gray-100"
                              disabled={
                                item.content?.stock_quantity != null &&
                                item.quantity >= item.content.stock_quantity
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Customer Information</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={customerInfo.fullName}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, fullName: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email *</label>
                      <input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="+254 700 000 000"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Shipping Address</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Street Address *</label>
                      <input
                        type="text"
                        value={shippingAddress.address}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">City *</label>
                        <input
                          type="text"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Nairobi"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={shippingAddress.postalCode}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="00100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Method */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Delivery Method</h2>
                  </div>
                  <div className="space-y-3">
                    {DELIVERY_METHODS.map((method) => (
                      <div
                        key={method.id}
                        onClick={() => setSelectedDelivery(method)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedDelivery?.id === method.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{method.name}</h3>
                            <p className="text-sm text-gray-600">{method.description}</p>
                            <p className="text-sm text-gray-500 mt-1">{method.estimatedDays}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {method.cost === 0 ? 'Free' : `KSh ${method.cost.toLocaleString()}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedDelivery && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deliveryReviewed}
                          onChange={(e) => setDeliveryReviewed(e.target.checked)}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm">
                          I have reviewed and confirmed the delivery details
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Discount Code */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Discount Code</h2>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter discount code"
                    />
                    <button
                      onClick={applyDiscount}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedDiscount && (
                    <p className="text-green-600 text-sm mt-2">
                      ✓ Discount code <strong>{appliedDiscount.code}</strong> applied —{' '}
                      {appliedDiscount.amount}% off
                    </p>
                  )}
                </div>
              </div>

              {/* ── Right Column — Order Summary ── */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                  <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold">KSh {subtotal.toLocaleString()}</span>
                    </div>
                    {appliedDiscount && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({appliedDiscount.code})</span>
                        <span>-KSh {discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery</span>
                      <span className="font-semibold">
                        {deliveryCost === 0 ? 'Free' : `KSh ${deliveryCost.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary">KSh {total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing || !user || !deliveryReviewed}
                    className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Package className="h-5 w-5" />
                        Place Order
                      </>
                    )}
                  </button>

                  {!user && (
                    <p className="text-sm text-red-500 mt-2 text-center">
                      Please log in to checkout
                    </p>
                  )}
                  {user && !deliveryReviewed && (
                    <p className="text-sm text-amber-600 mt-2 text-center">
                      Please review delivery details
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Cart;