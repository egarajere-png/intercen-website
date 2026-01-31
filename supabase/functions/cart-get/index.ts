// ============================================
// cart-get/index.ts - Get User's Cart
// ============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get cart with items and content details
    const { data: cart, error: cartError } = await supabaseClient
      .from('carts')
      .select(`
        id,
        cart_items (
          id,
          content_id,
          quantity,
          price,
          content (
            id,
            title,
            author,
            cover_image_url,
            stock_quantity,
            is_for_sale,
            status
          )
        )
      `)
      .eq('user_id', user.id)
      .maybeSingle()

    if (cartError) {
      console.error('Cart fetch error:', cartError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch cart', details: cartError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If no cart exists, return empty cart
    if (!cart) {
      return new Response(
        JSON.stringify({
          cart: null,
          items: [],
          summary: {
            subtotal: 0,
            item_count: 0
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Calculate summary
    const items = cart.cart_items || []
    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) =>
      sum + (item.price * item.quantity), 0
    )

    return new Response(
      JSON.stringify({
        cart: { id: cart.id },
        items: items,
        summary: {
          subtotal,
          item_count: items.length
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error in cart-get:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
