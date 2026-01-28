import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RemoveFromCartRequest {
  cart_item_id: string;
}

interface CartWithItems {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  items: CartItemDetail[];
  subtotal: number;
  total_items: number;
}

interface CartItemDetail {
  id: string;
  cart_id: string;
  content_id: string;
  quantity: number;
  price: number;
  added_at: string;
  content: {
    id: string;
    title: string;
    subtitle: string | null;
    author: string | null;
    cover_image_url: string | null;
    price: number;
    stock_quantity: number;
  };
  item_subtotal: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "You must be logged in to remove items from cart",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const requestData: RemoveFromCartRequest = await req.json();
    const { cart_item_id } = requestData;

    // Validate input
    if (!cart_item_id) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "cart_item_id is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Verify cart item exists and get cart_id
    const { data: cartItem, error: cartItemError } = await supabaseClient
      .from("cart_items")
      .select("id, cart_id")
      .eq("id", cart_item_id)
      .single();

    if (cartItemError || !cartItem) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Cart item not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Verify cart ownership
    const { data: cart, error: cartError } = await supabaseClient
      .from("carts")
      .select("id, user_id")
      .eq("id", cartItem.cart_id)
      .single();

    if (cartError || !cart) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Cart not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify cart belongs to authenticated user
    if (cart.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "You don't have permission to modify this cart",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Delete cart item
    const { error: deleteError } = await supabaseClient
      .from("cart_items")
      .delete()
      .eq("id", cart_item_id);

    if (deleteError) {
      throw deleteError;
    }

    // Step 4: Update cart timestamp
    const { error: cartUpdateError } = await supabaseClient
      .from("carts")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", cart.id);

    if (cartUpdateError) {
      throw cartUpdateError;
    }

    // Step 5: Fetch and return updated cart with remaining items
    const { data: updatedCart, error: fetchCartError } = await supabaseClient
      .from("carts")
      .select(
        `
        id,
        user_id,
        created_at,
        updated_at,
        items:cart_items (
          id,
          cart_id,
          content_id,
          quantity,
          price,
          added_at,
          content:content (
            id,
            title,
            subtitle,
            author,
            cover_image_url,
            price,
            stock_quantity
          )
        )
      `
      )
      .eq("id", cart.id)
      .single();

    if (fetchCartError) {
      throw fetchCartError;
    }

    // Calculate cart totals
    const cartItems = (updatedCart.items || []) as CartItemDetail[];
    const itemsWithSubtotals = cartItems.map((item) => ({
      ...item,
      item_subtotal: Number(item.price) * item.quantity,
    }));

    const subtotal = itemsWithSubtotals.reduce(
      (sum, item) => sum + item.item_subtotal,
      0
    );

    const totalItems = itemsWithSubtotals.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const response: CartWithItems = {
      ...updatedCart,
      items: itemsWithSubtotals,
      subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimal places
      total_items: totalItems,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in cart-remove-item function:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});