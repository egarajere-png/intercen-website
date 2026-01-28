// supabase/functions/checkout-initiate/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  customer_info: {
    fullName: string;
    email: string;
    phone: string;
  };
  shipping_address: {
    address: string;
    city: string;
    postalCode: string;
  };
  delivery_method: {
    id: string;
    name: string;
    cost: number;
    estimatedDays: string;
    description: string;
  };
  discount_code?: string;
}

interface CartItem {
  id: string;
  content_id: string;
  quantity: number;
  price: number;
  content: {
    title: string;
    stock_quantity: number;
  };
}

// Generate random alphanumeric string
function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate order number in format: ORD-YYYYMMDD-XXXX
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const random = randomString(4);
  
  return `ORD-${dateStr}-${random}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Checkout Initiate Started ===');
    
    // Get Supabase environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      throw new Error('Server configuration error');
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    console.log('Token received:', token.substring(0, 20) + '...');
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the user's JWT token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: userError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      console.error('No user found');
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Parse request body
    let body: CheckoutRequest;
    try {
      body = await req.json();
      console.log('Request body received:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { customer_info, shipping_address, delivery_method, discount_code } = body;

    // Validate required fields
    if (!customer_info?.fullName || !customer_info?.phone) {
      console.error('Missing customer info');
      return new Response(
        JSON.stringify({ error: 'Customer information is incomplete' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!shipping_address?.address || !shipping_address?.city) {
      console.error('Missing shipping address');
      return new Response(
        JSON.stringify({ error: 'Shipping address is incomplete' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!delivery_method) {
      console.error('Missing delivery method');
      return new Response(
        JSON.stringify({ error: 'Delivery method is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get cart
    console.log('Fetching cart for user:', user.id);
    const { data: cartData, error: cartError } = await supabaseAdmin
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (cartError) {
      console.error('Cart fetch error:', cartError);
      throw new Error(`Failed to fetch cart: ${cartError.message}`);
    }

    if (!cartData) {
      console.error('No cart found');
      return new Response(
        JSON.stringify({ error: 'Cart not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cartId = cartData.id;
    console.log('Cart ID:', cartId);

    // Get cart items with content details
    const { data: cartItems, error: itemsError } = await supabaseAdmin
      .from('cart_items')
      .select(`
        id,
        content_id,
        quantity,
        price,
        content:content_id (
          title,
          stock_quantity
        )
      `)
      .eq('cart_id', cartId);

    if (itemsError) {
      console.error('Cart items error:', itemsError);
      throw new Error(`Failed to fetch cart items: ${itemsError.message}`);
    }

    if (!cartItems || cartItems.length === 0) {
      console.error('Cart is empty');
      return new Response(
        JSON.stringify({ error: 'Cart is empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${cartItems.length} items in cart`);

    // Validate stock availability
    const stockErrors: string[] = [];
    for (const item of cartItems) {
      const typedItem = item as CartItem;
      if (!typedItem.content || typedItem.content.stock_quantity < typedItem.quantity) {
        stockErrors.push(`Insufficient stock for ${typedItem.content?.title || 'item'}`);
      }
    }

    if (stockErrors.length > 0) {
      console.error('Stock validation failed:', stockErrors);
      return new Response(
        JSON.stringify({ 
          error: 'Stock validation failed',
          details: stockErrors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = 0;
    const shipping = delivery_method.cost;
    
    // Apply discount if provided
    let discount = 0;
    let discountCodeUsed = null;
    
    if (discount_code) {
      console.log('Checking discount code:', discount_code);
      const { data: discountData } = await supabaseAdmin
        .from('discount_codes')
        .select('*')
        .eq('code', discount_code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (discountData) {
        console.log('Discount found:', discountData);
        const now = new Date();
        const validFrom = discountData.valid_from ? new Date(discountData.valid_from) : null;
        const validUntil = discountData.valid_until ? new Date(discountData.valid_until) : null;

        if ((!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
          if (discountData.discount_type === 'percentage') {
            discount = subtotal * (discountData.discount_value / 100);
          } else if (discountData.discount_type === 'fixed') {
            discount = discountData.discount_value;
          }
          discount = Math.min(discount, subtotal);
          discountCodeUsed = discountData.code;
          console.log('Discount applied:', discount);
        }
      }
    }

    const totalPrice = subtotal + tax + shipping - discount;

    // Step 4: Generate unique order number
    const orderNumber = generateOrderNumber();
    console.log('Generated order number:', orderNumber);

    // Format addresses
    const shippingAddressText = `${shipping_address.address}, ${shipping_address.city}${shipping_address.postalCode ? ', ' + shipping_address.postalCode : ''}`;
    const billingAddressText = shippingAddressText;

    // Step 6: Create order
    console.log('Creating order...');
    const orderInsertData = {
      order_number: orderNumber,
      user_id: user.id,
      sub_total: subtotal,
      tax: tax,
      shipping: shipping,
      discount: discount,
      total_price: totalPrice,
      status: 'pending',
      payment_status: 'pending',
      shipping_address: shippingAddressText,
      billing_address: billingAddressText,
      payment_method: null,
      customer_name: customer_info.fullName,
      customer_email: customer_info.email || user.email,
      customer_phone: customer_info.phone,
      discount_code: discountCodeUsed,
    };

    console.log('Order data:', orderInsertData);

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    const orderId = orderData.id;
    console.log('Order created with ID:', orderId);

    // Step 7: Create order items
    console.log('Creating order items...');
    const orderItemsToInsert = cartItems.map(item => ({
      order_id: orderId,
      content_id: item.content_id,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }));

    console.log('Order items to insert:', orderItemsToInsert.length);

    const { error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsToInsert);

    if (orderItemsError) {
      console.error('Order items error:', orderItemsError);
      // Rollback: Delete the order
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
      throw new Error(`Failed to create order items: ${orderItemsError.message}`);
    }

    console.log('Order items created successfully');

    // Step 8: Reserve stock
    console.log('Reserving stock...');
    const stockUpdateErrors: string[] = [];
    
    for (const item of cartItems) {
      const typedItem = item as CartItem;
      
      // Get current stock
      const { data: contentData, error: fetchError } = await supabaseAdmin
        .from('content')
        .select('stock_quantity')
        .eq('id', typedItem.content_id)
        .single();

      if (fetchError || !contentData) {
        console.error('Failed to fetch content:', fetchError);
        stockUpdateErrors.push(`Failed to check stock for ${typedItem.content.title}`);
        continue;
      }

      if (contentData.stock_quantity < typedItem.quantity) {
        stockUpdateErrors.push(`Insufficient stock for ${typedItem.content.title}`);
        continue;
      }

      // Update stock
      const newStock = contentData.stock_quantity - typedItem.quantity;
      const { error: stockError } = await supabaseAdmin
        .from('content')
        .update({ stock_quantity: newStock })
        .eq('id', typedItem.content_id);

      if (stockError) {
        console.error('Stock update error:', stockError);
        stockUpdateErrors.push(`Failed to update stock for ${typedItem.content.title}`);
      } else {
        console.log(`Stock updated for ${typedItem.content.title}: ${contentData.stock_quantity} -> ${newStock}`);
      }
    }

    if (stockUpdateErrors.length > 0) {
      console.error('Stock reservation failed:', stockUpdateErrors);
      // Rollback
      await supabaseAdmin.from('order_items').delete().eq('order_id', orderId);
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
      
      return new Response(
        JSON.stringify({ 
          error: 'Stock reservation failed',
          details: stockUpdateErrors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clear cart
    console.log('Clearing cart...');
    const { error: clearCartError } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId);

    if (clearCartError) {
      console.error('Failed to clear cart:', clearCartError);
      // Don't fail the order for this
    } else {
      console.log('Cart cleared successfully');
    }

    // Step 10: Return response
    const response = {
      success: true,
      order_id: orderId,
      order_number: orderNumber,
      total_price: totalPrice,
      subtotal: subtotal,
      tax: tax,
      shipping: shipping,
      discount: discount,
      customer_info: customer_info,
      shipping_address: shippingAddressText,
      delivery_method: delivery_method,
      items: cartItems.map(item => {
        const typedItem = item as CartItem;
        return {
          content_id: typedItem.content_id,
          title: typedItem.content.title,
          quantity: typedItem.quantity,
          price: typedItem.price,
          total: typedItem.price * typedItem.quantity
        };
      }),
      message: 'Order created successfully. Proceed to payment.'
    };

    console.log('=== Checkout Initiate Completed Successfully ===');

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('=== Checkout Initiate Error ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});