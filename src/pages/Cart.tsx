import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, User, MapPin, Truck, Package, CheckCircle, X } from "lucide-react";
import { supabase } from '../lib/SupabaseClient';
import { Layout } from '@/components/layout/Layout';

// Types
interface CartItem {
  id: string;
  content_id: string;
  quantity: number;
  price: number;
  content: {
    title: string;
    author: string;
    cover_image_url: string;
    stock_quantity: number;
  };
}

interface DeliveryMethod {
  id: string;
  name: string;
  cost: number;
  estimatedDays: string;
  description: string;
}

const Cart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Customer Info
  const [customerInfo, setCustomerInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  
  // Shipping Address
  const [shippingAddress, setShippingAddress] = useState({
    address: "",
    city: "",
    postalCode: "",
  });
  
  // Delivery
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryMethod | null>(null);
  const [deliveryReviewed, setDeliveryReviewed] = useState(false);
  
  // Discount
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    type: 'percentage' | 'fixed';
  } | null>(null);

  // Order Confirmation Modal State
  const [orderConfirmation, setOrderConfirmation] = useState<{
    open: boolean;
    orderNumber?: string;
    orderId?: string;
  }>({ open: false });

  const deliveryMethods: DeliveryMethod[] = [
    {
      id: 'standard',
      name: 'Standard Delivery',
      cost: 500,
      estimatedDays: '3-5 business days',
      description: 'Regular delivery within city'
    },
    {
      id: 'express',
      name: 'Express Delivery',
      cost: 1000,
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

  useEffect(() => {
    checkUser();
    fetchCart();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      setCustomerInfo(prev => ({
        ...prev,
        email: user.email || ""
      }));
    }
  };

  const fetchCart = async () => {
    try {
      setLoading(true);
      
      // Use GET method for cart-get
      const { data, error } = await supabase.functions.invoke('cart-get', {
        method: 'GET'
      });
      
      if (error) throw error;
      
      setCartItems(data?.items || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('cart-update-quantity', {
        body: { cart_item_id: itemId, quantity: newQuantity }
      });
      
      if (error) throw error;
      
      await fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase.functions.invoke('cart-remove-item', {
        body: { cart_item_id: itemId }
      });
      
      if (error) throw error;
      
      await fetchCart();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const applyDiscount = () => {
    // Mock discount logic
    if (discountCode.toUpperCase() === 'SAVE10') {
      setAppliedDiscount({
        code: 'SAVE10',
        amount: 10,
        type: 'percentage'
      });
    }
  };

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
      alert('Please provide shipping address');
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

      // Get the current session with access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        alert('Session expired. Please log in again.');
        navigate('/auth');
        return;
      }

      // Prepare checkout data
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

      console.log('Initiating checkout with data:', checkoutData);

      // Call the edge function with proper authorization
      const { data, error } = await supabase.functions.invoke('checkout-initiate', {
        body: checkoutData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        alert(error.message || 'Failed to initiate checkout');
        return;
      }

      if (!data || !data.success) {
        console.error('Checkout failed:', data);
        alert(data?.error || 'Checkout failed');
        return;
      }

      console.log('Order created successfully:', data);

      // Success - show on-screen modal instead of alert
      setOrderConfirmation({
        open: true,
        orderNumber: data.order_number,
        orderId: data.order_id
      });

    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(error.message || 'An unexpected error occurred during checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  // Modal component
  const OrderConfirmationModal = () => (
    orderConfirmation.open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center relative">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
          <p className="mb-4">Your order was created successfully.</p>
          <p className="mb-4 font-semibold">Order Number: <span className="text-primary">{orderConfirmation.orderNumber}</span></p>
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

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = appliedDiscount 
    ? appliedDiscount.type === 'percentage' 
      ? (subtotal * appliedDiscount.amount) / 100
      : appliedDiscount.amount
    : 0;
  const deliveryCost = selectedDelivery?.cost || 0;
  const total = subtotal - discountAmount + deliveryCost;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading cart...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Order Confirmation Modal */}
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
                to="/shop"
                className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition"
              >
                Browse Books
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column - Cart Items & Forms */}
              <div className="lg:col-span-2 space-y-6">
                {/* Cart Items */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Cart Items ({cartItems.length})</h2>
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4 border-b pb-4 last:border-b-0">
                        <img
                          src={item.content.cover_image_url}
                          alt={item.content.title}
                          className="w-20 h-28 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.content.title}</h3>
                          <p className="text-sm text-gray-600">{item.content.author}</p>
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
                              disabled={item.quantity >= item.content.stock_quantity}
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
                    {deliveryMethods.map((method) => (
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
                        <span className="text-sm">I have reviewed and confirmed the delivery details</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Order Summary */}
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

                  {/* Discount Code */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Discount Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                        placeholder="Enter code"
                      />
                      <button
                        onClick={applyDiscount}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing || !user || !deliveryReviewed}
                    className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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