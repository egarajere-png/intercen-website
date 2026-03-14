// supabase/functions/cart-add-item/index.ts
// COMPREHENSIVE DEBUG VERSION - FULL LOGGING

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('============================================');
  console.log('🚀 CART ADD ITEM FUNCTION STARTED');
  console.log('============================================');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🌐 Request Method:', req.method);
  console.log('🔗 Request URL:', req.url);
  
  // Log all headers (redact sensitive ones)
  console.log('📋 Request Headers:');
  const headers = {};
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'authorization') {
      headers[key] = value ? `Bearer ${value.substring(7, 20)}...` : 'MISSING';
    } else if (key.toLowerCase() === 'apikey') {
      headers[key] = value ? `${value.substring(0, 10)}...` : 'MISSING';
    } else {
      headers[key] = value;
    }
  });
  console.log(JSON.stringify(headers, null, 2));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request - returning 200');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Step 1: Initialize Supabase client
    console.log('\n📦 Step 1: Initializing Supabase client...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('🔑 SUPABASE_URL exists:', !!supabaseUrl);
    console.log('🔑 SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
    console.log('🔑 SUPABASE_URL value:', supabaseUrl);
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ ERROR: Missing environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Authorization header exists:', !!authHeader);
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    )
    console.log('✅ Supabase client initialized');

    // Step 2: Authenticate user
    console.log('\n👤 Step 2: Authenticating user...');
    const {
      data: { user },
      error: authError
    } = await supabaseClient.auth.getUser()

    if (authError) {
      console.error('❌ Authentication error:', authError);
      console.error('Auth error details:', JSON.stringify(authError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: authError.message 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!user) {
      console.error('❌ No user found in session');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No user session' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ User authenticated successfully');
    console.log('👤 User ID:', user.id);
    console.log('📧 User Email:', user.email);

    // Step 3: Parse request body
    console.log('\n📝 Step 3: Parsing request body...');
    let requestBody;
    let rawBody;
    
    try {
      rawBody = await req.text();
      console.log('📄 Raw request body:', rawBody);
      
      requestBody = JSON.parse(rawBody);
      console.log('✅ Parsed request body:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      console.error('Raw body that failed:', rawBody);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message,
          received: rawBody
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { content_id, quantity = 1 } = requestBody;
    
    console.log('📦 Extracted content_id:', content_id);
    console.log('🔢 Extracted quantity:', quantity);

    // Step 4: Validate input
    console.log('\n✔️ Step 4: Validating input...');
    if (!content_id) {
      console.error('❌ Validation failed: content_id is missing');
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed',
          details: 'content_id is required',
          received: requestBody
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (typeof quantity !== 'number' || quantity < 1) {
      console.error('❌ Validation failed: invalid quantity');
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed',
          details: 'quantity must be a positive number',
          received: { quantity }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Input validation passed');

    // Step 5: Get or create cart
    console.log('\n🛒 Step 5: Getting or creating cart...');
    console.log('🔍 Looking for cart with user_id:', user.id);
    
    let { data: cart, error: cartError } = await supabaseClient
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    console.log('Cart query result:', { cart, error: cartError });

    if (cartError) {
      console.error('❌ Error fetching cart:', cartError);
      console.error('Cart error details:', JSON.stringify(cartError, null, 2));
    }

    if (!cart) {
      console.log('📝 No existing cart found, creating new cart...');
      const { data: newCart, error: createError } = await supabaseClient
        .from('carts')
        .insert({ user_id: user.id })
        .select()
        .single()

      console.log('Cart creation result:', { newCart, error: createError });

      if (createError) {
        console.error('❌ Error creating cart:', createError);
        console.error('Create error details:', JSON.stringify(createError, null, 2));
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create cart', 
            details: createError.message,
            code: createError.code,
            hint: createError.hint
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      cart = newCart
      console.log('✅ New cart created with ID:', cart.id);
    } else {
      console.log('✅ Existing cart found with ID:', cart.id);
    }

    // Step 6: Get content details
    console.log('\n📚 Step 6: Fetching content details...');
    console.log('🔍 Looking for content with ID:', content_id);
    
    const { data: content, error: contentError } = await supabaseClient
      .from('content')
      .select('id, title, price, stock_quantity, is_for_sale, status')
      .eq('id', content_id)
      .maybeSingle()

    console.log('Content query result:', { content, error: contentError });

    if (contentError) {
      console.error('❌ Error fetching content:', contentError);
      console.error('Content error details:', JSON.stringify(contentError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch content', 
          details: contentError.message,
          code: contentError.code
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!content) {
      console.error('❌ Content not found with ID:', content_id);
      return new Response(
        JSON.stringify({ 
          error: 'Content not found',
          content_id: content_id
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Content found:', JSON.stringify(content, null, 2));

    // Step 7: Validate content
    console.log('\n✔️ Step 7: Validating content availability...');
    
    if (!content.is_for_sale) {
      console.error('❌ Content is not for sale');
      return new Response(
        JSON.stringify({ 
          error: 'This content is not for sale',
          content_id: content_id
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (content.status !== 'published') {
      console.error('❌ Content is not published. Status:', content.status);
      return new Response(
        JSON.stringify({ 
          error: 'This content is not available',
          status: content.status
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (content.stock_quantity !== null && content.stock_quantity < quantity) {
      console.error('❌ Insufficient stock. Available:', content.stock_quantity, 'Requested:', quantity);
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient stock',
          available: content.stock_quantity,
          requested: quantity
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Content is available for purchase');

    // Step 8: Check if item already in cart
    console.log('\n🔍 Step 8: Checking if item already in cart...');
    
    const { data: existingItem, error: existingError } = await supabaseClient
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cart.id)
      .eq('content_id', content_id)
      .maybeSingle()

    console.log('Existing item query result:', { existingItem, error: existingError });

    if (existingError) {
      console.error('❌ Error checking existing item:', existingError);
    }

    if (existingItem) {
      // Step 9a: Update existing item
      console.log('\n📝 Step 9a: Item exists, updating quantity...');
      console.log('Current quantity:', existingItem.quantity);
      console.log('New quantity:', existingItem.quantity + quantity);
      
      const { data: updatedItem, error: updateError } = await supabaseClient
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
        .select()
        .single()

      console.log('Update result:', { updatedItem, error: updateError });

      if (updateError) {
        console.error('❌ Error updating cart item:', updateError);
        console.error('Update error details:', JSON.stringify(updateError, null, 2));
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update cart', 
            details: updateError.message,
            code: updateError.code,
            hint: updateError.hint
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('✅ Cart item updated successfully');
      console.log('============================================');
      console.log('✅ SUCCESS - Cart updated');
      console.log('============================================\n');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Cart updated',
          cart_item: updatedItem 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      // Step 9b: Add new item
      console.log('\n➕ Step 9b: Adding new item to cart...');
      const itemToInsert = {
        cart_id: cart.id,
        content_id: content_id,
        quantity: quantity,
        price: content.price
      };
      console.log('Item to insert:', JSON.stringify(itemToInsert, null, 2));
      
      const { data: newItem, error: insertError } = await supabaseClient
        .from('cart_items')
        .insert(itemToInsert)
        .select()
        .single()

      console.log('Insert result:', { newItem, error: insertError });

      if (insertError) {
        console.error('❌ Error adding to cart:', insertError);
        console.error('Insert error details:', JSON.stringify(insertError, null, 2));
        return new Response(
          JSON.stringify({ 
            error: 'Failed to add to cart', 
            details: insertError.message,
            code: insertError.code,
            hint: insertError.hint
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('✅ Item added to cart successfully');
      console.log('============================================');
      console.log('✅ SUCCESS - Item added to cart');
      console.log('============================================\n');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Item added to cart',
          cart_item: newItem 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('\n💥 UNEXPECTED ERROR CAUGHT:');
    console.error('============================================');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('============================================\n');
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})