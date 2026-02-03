// supabase/functions/cart-add-item/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
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
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    )

    // Authenticate user
    const {
      data: { user },
      error: authError
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No user session' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    let requestBody;
    
    try {
      const rawBody = await req.text();
      requestBody = JSON.parse(rawBody);
    } catch (parseError: unknown) {
      const err = parseError as Error;
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: err.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { content_id, quantity = 1 } = requestBody;

    // Validate input
    if (!content_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed',
          details: 'content_id is required'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (typeof quantity !== 'number' || quantity < 1) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed',
          details: 'quantity must be a positive number'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get or create cart
    let { data: cart, error: cartError } = await supabaseClient
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (cartError) {
      console.error('Error fetching cart:', cartError);
    }

    if (!cart) {
      const { data: newCart, error: createError } = await supabaseClient
        .from('carts')
        .insert({ user_id: user.id })
        .select()
        .single()

      if (createError) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create cart', 
            details: createError.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      cart = newCart
    }

    if (!cart) {
      return new Response(
        JSON.stringify({ error: 'Failed to get or create cart' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get content details
    const { data: content, error: contentError } = await supabaseClient
      .from('content')
      .select('id, title, price, stock_quantity, is_for_sale, status')
      .eq('id', content_id)
      .maybeSingle()

    if (contentError) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch content', 
          details: contentError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!content) {
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

    // Validate content
    if (!content.is_for_sale) {
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

    // Check if item already in cart
    const { data: existingItem, error: existingError } = await supabaseClient
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cart.id)
      .eq('content_id', content_id)
      .maybeSingle()

    if (existingError) {
      console.error('Error checking existing item:', existingError);
    }

    if (existingItem) {
      // Update existing item
      const { data: updatedItem, error: updateError } = await supabaseClient
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
        .select()
        .single()

      if (updateError) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update cart', 
            details: updateError.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

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
      // Add new item
      const itemToInsert = {
        cart_id: cart.id,
        content_id: content_id,
        quantity: quantity,
        price: content.price
      };
      
      const { data: newItem, error: insertError } = await supabaseClient
        .from('cart_items')
        .insert(itemToInsert)
        .select()
        .single()

      if (insertError) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to add to cart', 
            details: insertError.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

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

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Unexpected error:', err);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: err.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
