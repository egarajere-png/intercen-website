/**
 * Cart Clear Function
 * Empties user's cart - typically called after successful checkout
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmptyCartResponse {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  items: [];
  subtotal: 0;
  total_items: 0;
  message: string;
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
          message: "You must be logged in to clear cart",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's cart
    const { data: cart, error: cartError } = await supabaseClient
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (cartError) {
      throw cartError;
    }

    // If no cart exists, return empty cart response
    if (!cart) {
      const emptyResponse: EmptyCartResponse = {
        id: "",
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [],
        subtotal: 0,
        total_items: 0,
        message: "Cart is already empty",
      };

      return new Response(JSON.stringify(emptyResponse), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete all cart items
    const { error: deleteError } = await supabaseClient
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id);

    if (deleteError) {
      throw deleteError;
    }

    // Update cart timestamp
    const { data: updatedCart, error: updateError } = await supabaseClient
      .from("carts")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", cart.id)
      .select("id, user_id, created_at, updated_at")
      .single();

    if (updateError) {
      throw updateError;
    }

    const response: EmptyCartResponse = {
      ...updatedCart,
      items: [],
      subtotal: 0,
      total_items: 0,
      message: "Cart cleared successfully",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in cart-clear function:", err);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: err.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
