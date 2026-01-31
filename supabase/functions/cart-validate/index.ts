/**
 * Cart Validate Function
 * Validates cart before checkout - checks stock, prices, and item availability
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContentInfo {
  id: string;
  title: string;
  price: number;
  status: string;
  is_for_sale: boolean;
  stock_quantity: number;
}

interface CartItem {
  id: string;
  cart_id: string;
  content_id: string;
  quantity: number;
  price: number;
  content: ContentInfo;
}

interface ValidationError {
  cart_item_id: string;
  content_id: string;
  title: string;
  error: string;
  error_type:
    | "not_published"
    | "not_for_sale"
    | "out_of_stock"
    | "price_changed"
    | "discontinued";
  details?: {
    old_price?: number;
    new_price?: number;
    price_change_percent?: number;
    requested_quantity?: number;
    available_quantity?: number;
  };
}

interface ValidationResponse {
  is_valid: boolean;
  errors: ValidationError[];
  cart: {
    id: string;
    total_items: number;
    subtotal: number;
  };
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
          message: "You must be logged in to validate cart",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's cart with all items and content details
    const { data: cart, error: cartError } = await supabaseClient
      .from("carts")
      .select(
        `
        id,
        user_id,
        items:cart_items (
          id,
          cart_id,
          content_id,
          quantity,
          price,
          content:content (
            id,
            title,
            price,
            status,
            is_for_sale,
            stock_quantity
          )
        )
      `
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (cartError) {
      throw cartError;
    }

    // If no cart exists, return valid empty cart
    if (!cart || !cart.items || cart.items.length === 0) {
      const response: ValidationResponse = {
        is_valid: true,
        errors: [],
        cart: {
          id: cart?.id || "",
          total_items: 0,
          subtotal: 0,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const errors: ValidationError[] = [];
    let subtotal = 0;
    let totalItems = 0;

    // Validate each cart item
    for (const rawItem of cart.items) {
      // Handle the case where content might be an array from the join
      const item = rawItem as unknown as CartItem;
      const content = Array.isArray(rawItem.content) ? rawItem.content[0] : rawItem.content;
      
      if (!content) continue;
      
      const cartPrice = Number(item.price);
      const currentPrice = Number(content.price);
      const priceChange = Math.abs(currentPrice - cartPrice);
      const priceChangePercent = (priceChange / cartPrice) * 100;

      // Check if content is still published
      if (content.status !== "published") {
        errors.push({
          cart_item_id: item.id,
          content_id: item.content_id,
          title: content.title,
          error: "This item is no longer available",
          error_type:
            content.status === "discontinued"
              ? "discontinued"
              : "not_published",
        });
        continue;
      }

      // Check if content is still for sale
      if (!content.is_for_sale) {
        errors.push({
          cart_item_id: item.id,
          content_id: item.content_id,
          title: content.title,
          error: "This item is no longer for sale",
          error_type: "not_for_sale",
        });
        continue;
      }

      // Check stock availability
      if (item.quantity > content.stock_quantity) {
        errors.push({
          cart_item_id: item.id,
          content_id: item.content_id,
          title: content.title,
          error: `Insufficient stock. Only ${content.stock_quantity} available`,
          error_type: "out_of_stock",
          details: {
            requested_quantity: item.quantity,
            available_quantity: content.stock_quantity,
          },
        });
        continue;
      }

      // Check for significant price changes (>10%)
      if (priceChangePercent > 10) {
        errors.push({
          cart_item_id: item.id,
          content_id: item.content_id,
          title: content.title,
          error: `Price has changed significantly from ${cartPrice.toFixed(
            2
          )} to ${currentPrice.toFixed(2)} (${priceChangePercent.toFixed(
            1
          )}% change)`,
          error_type: "price_changed",
          details: {
            old_price: cartPrice,
            new_price: currentPrice,
            price_change_percent: Math.round(priceChangePercent * 10) / 10,
          },
        });
        continue;
      }

      // If item passes all validations, add to totals
      subtotal += cartPrice * item.quantity;
      totalItems += item.quantity;
    }

    const response: ValidationResponse = {
      is_valid: errors.length === 0,
      errors,
      cart: {
        id: cart.id,
        total_items: totalItems,
        subtotal: Math.round(subtotal * 100) / 100,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in cart-validate function:", err);

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
