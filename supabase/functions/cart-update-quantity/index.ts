import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateQuantityRequest {
  cart_item_id: string;
  quantity: number;
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "You must be logged in to update cart",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestData: UpdateQuantityRequest = await req.json();
    const { cart_item_id, quantity } = requestData;

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

    if (quantity === undefined || quantity === null) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "quantity is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get cart item with content stock info
    const { data: cartItemData, error: cartItemError } = await supabaseClient
      .from("cart_items")
      .select(
        `
        id,
        cart_id,
        content_id,
        quantity,
        content:content (
          id,
          stock_quantity
        )
      `
      )
      .eq("id", cart_item_id)
      .single();

    if (cartItemError || !cartItemData) {
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

    // Verify cart ownership
    const { data: cart, error: cartError } = await supabaseClient
      .from("carts")
      .select("id, user_id")
      .eq("id", cartItemData.cart_id)
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

    // Handle quantity <= 0: DELETE item
    if (quantity <= 0) {
      const { error: deleteError } = await supabaseClient
        .from("cart_items")
        .delete()
        .eq("id", cart_item_id);

      if (deleteError) {
        throw deleteError;
      }

      // Update cart timestamp
      await supabaseClient
        .from("carts")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", cart.id);

      // Return updated cart
      const { data: updatedCart, error: fetchCartError } =
        await supabaseClient
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
        subtotal: Math.round(subtotal * 100) / 100,
        total_items: totalItems,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate stock availability
    const stockQuantity = cartItemData.content.stock_quantity;
    if (quantity > stockQuantity) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: `Insufficient stock. Only ${stockQuantity} available`,
          available_quantity: stockQuantity,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update quantity
    const { error: updateError } = await supabaseClient
      .from("cart_items")
      .update({ quantity })
      .eq("id", cart_item_id);

    if (updateError) {
      throw updateError;
    }

    // Update cart timestamp
    await supabaseClient
      .from("carts")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", cart.id);

    // Return updated cart
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

    const cartItems = updatedCart.items as CartItemDetail[];
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
      subtotal: Math.round(subtotal * 100) / 100,
      total_items: totalItems,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in cart-update-quantity function:", error);

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