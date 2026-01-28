import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, User, MapPin, Truck, Package, CheckCircle, X } from "lucide-react";
import { supabase } from '../lib/supabaseClient';
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

      // Success - redirect to payment page
      alert(`Order created successfully! Order Number: ${data.order_number}`);
      navigate(`/checkout/payment/${data.order_id}`);

    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(error.message || 'An unexpected error occurred during checkout');
    } finally {
      setIsProcessing(false);
    }
  };

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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-serif text-3xl font-bold mb-8 flex items-center gap-2">
            <ShoppingBag className="h-8 w-8" />
            Shopping Cart ({cartItems.length})
          </h1>

          {!user && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-yellow-600" />
                <p className="text-yellow-800">
                  Please{' '}
                  <button
                    onClick={() => navigate('/auth')}
                    className="font-semibold underline hover:text-yellow-900"
                  >
                    log in
                  </button>{' '}
                  to place an order
                </p>
              </div>
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Add some books to get started!</p>
              <button
                onClick={() => navigate('/books')}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
              >
                Browse Books
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold">Cart Items</h2>
                  </div>
                  <div className="divide-y">
                    {cartItems.map((item) => (
                      <div key={item.id} className="p-6 flex gap-4">
                        <Link to={`/book/${item.content_id}`} className="flex-shrink-0">
                          <img
                            src={item.content.cover_image_url || '/placeholder-book.png'}
                            alt={item.content.title}
                            className="w-24 h-32 object-cover rounded"
                          />
                        </Link>
                        
                        <div className="flex-1">
                          <Link to={`/book/${item.content_id}`}>
                            <h3 className="font-semibold text-lg hover:text-primary">
                              {item.content.title}
                            </h3>
                          </Link>
                          <p className="text-muted-foreground text-sm mt-1">by {item.content.author}</p>
                          <p className="text-primary font-semibold mt-2">
                            KES {item.price.toLocaleString()}
                          </p>
                          
                          {item.content.stock_quantity < 5 && (
                            <p className="text-red-600 text-sm mt-2">
                              Only {item.content.stock_quantity} left in stock
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end justify-between">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                          
                          <div className="flex items-center gap-2 border rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-2 hover:bg-gray-100 rounded-l-lg"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-4 font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-2 hover:bg-gray-100 rounded-r-lg"
                              disabled={item.quantity >= item.content.stock_quantity}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <p className="font-semibold mt-2">
                            KES {(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {user && (
                  <>
                    {/* Customer Information */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Customer Information
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Full Name *</label>
                          <input
                            type="text"
                            value={customerInfo.fullName}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, fullName: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Email *</label>
                          <input
                            type="email"
                            value={customerInfo.email}
                            disabled
                            className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Phone Number *</label>
                          <input
                            type="tel"
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary"
                            placeholder="+254 712 345 678"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Shipping Address
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Street Address *</label>
                          <input
                            type="text"
                            value={shippingAddress.address}
                            onChange={(e) => setShippingAddress(prev => ({ ...prev, address: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary"
                            placeholder="123 Main Street"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">City *</label>
                            <input
                              type="text"
                              value={shippingAddress.city}
                              onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary"
                              placeholder="Nairobi"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Postal Code</label>
                            <input
                              type="text"
                              value={shippingAddress.postalCode}
                              onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary"
                              placeholder="00100"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Method */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Delivery Method
                      </h2>
                      <div className="space-y-3">
                        {deliveryMethods.map((method) => (
                          <div
                            key={method.id}
                            onClick={() => setSelectedDelivery(method)}
                            className={`border rounded-lg p-4 cursor-pointer transition ${
                              selectedDelivery?.id === method.id
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Package className="h-5 w-5 text-primary" />
                                  <h3 className="font-semibold">{method.name}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{method.description}</p>
                                <p className="text-sm text-muted-foreground mt-1">Est. {method.estimatedDays}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  {method.cost === 0 ? 'FREE' : `KES ${method.cost.toLocaleString()}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="deliveryReview"
                          checked={deliveryReviewed}
                          onChange={(e) => setDeliveryReviewed(e.target.checked)}
                          className="mt-1"
                        />
                        <label htmlFor="deliveryReview" className="text-sm cursor-pointer">
                          I have reviewed the delivery method and cost
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right Column - Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                  <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                  
                  {/* Discount Code */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Discount Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2"
                        placeholder="Enter code"
                      />
                      <button
                        onClick={applyDiscount}
                        className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                      >
                        Apply
                      </button>
                    </div>
                    {appliedDiscount && (
                      <div className="mt-2 flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>Code "{appliedDiscount.code}" applied!</span>
                        <button onClick={() => setAppliedDiscount(null)} className="ml-auto">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium">KES {subtotal.toLocaleString()}</span>
                    </div>
                    
                    {appliedDiscount && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({appliedDiscount.code})</span>
                        <span className="font-medium">-KES {discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {selectedDelivery && (
                      <div className="flex justify-between">
                        <span>Delivery</span>
                        <span className="font-medium">
                          {deliveryCost === 0 ? 'FREE' : `KES ${deliveryCost.toLocaleString()}`}
                        </span>
                      </div>
                    )}
                    
                    <div className="border-t pt-3 flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>KES {total.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={!user || !selectedDelivery || !deliveryReviewed || isProcessing}
                    className="w-full mt-6 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </span>
                    ) : !user ? (
                      'Login to Checkout'
                    ) : !selectedDelivery ? (
                      'Select Delivery Method'
                    ) : (
                      'Proceed to Payment'
                    )}
                  </button>

                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    Secure checkout powered by M-Pesa
                  </p>
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