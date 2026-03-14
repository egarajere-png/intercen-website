import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('🚀 content-part-update function invoked');

    // Create Supabase client (using anon key – no user context)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // ───────────────────────────────────────────────
    // Parse incoming payload (JSON or FormData)
    // ───────────────────────────────────────────────
    let payload: Record<string, any> = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          payload[key] = value;
        }
        // We intentionally ignore files here – this endpoint is for metadata only
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported Content-Type. Use application/json or multipart/form-data' }),
        { status: 415, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content_id = payload.content_id as string;

    if (!content_id) {
      console.error('Missing content_id');
      return new Response(
        JSON.stringify({ error: 'content_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updating content: ${content_id}`);

    // ───────────────────────────────────────────────
    // Prepare fields for direct update on content table
    // ───────────────────────────────────────────────
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Simple string / text fields
    const stringFields = [
      'title', 'subtitle', 'author', 'publisher', 'description',
      'content_type', 'isbn', 'language', 'visibility', 'status',
      'version', 'category_id'
    ];

    stringFields.forEach(field => {
      if (payload[field] !== undefined && payload[field] !== '') {
        updateData[field] = payload[field];
      }
    });

    // Numeric fields
    if ('price' in payload) {
      const price = parseFloat(payload.price);
      updateData.price = isNaN(price) ? 0 : price;
    }

    if ('page_count' in payload) {
      const count = parseInt(payload.page_count, 10);
      updateData.page_count = isNaN(count) ? null : count;
    }

    if ('stock_quantity' in payload) {
      const qty = parseInt(payload.stock_quantity, 10);
      updateData.stock_quantity = isNaN(qty) ? 0 : qty;
    }

    // Boolean fields
    if ('is_featured' in payload) {
      updateData.is_featured = payload.is_featured === 'true' || payload.is_featured === true;
    }

    if ('is_for_sale' in payload) {
      updateData.is_for_sale = payload.is_for_sale === 'true' || payload.is_for_sale === true;
    }

    // ───────────────────────────────────────────────
    // Special handling: tags (many-to-many via RPC)
    // ───────────────────────────────────────────────
    let tagsUpdated = false;

    if ('tags' in payload && payload.tags) {
      let tagNames: string[] = [];

      try {
        if (typeof payload.tags === 'string') {
          // Accept both JSON string and plain comma-separated
          if (payload.tags.trim().startsWith('[')) {
            tagNames = JSON.parse(payload.tags);
          } else {
            tagNames = payload.tags
              .split(',')
              .map((t: string) => t.trim())
              .filter(Boolean);
          }
        } else if (Array.isArray(payload.tags)) {
          tagNames = payload.tags;
        }

        tagNames = [...new Set(tagNames)]; // remove duplicates

        console.log(`Syncing ${tagNames.length} tags for content ${content_id}`);

        const { error: rpcError } = await supabase.rpc('sync_content_tags', {
          p_content_id: content_id,
          p_tag_names: tagNames,
        });

        if (rpcError) {
          console.error('sync_content_tags RPC failed:', rpcError.message);
          // You can choose to fail the request or continue – here we continue
        } else {
          tagsUpdated = true;
          console.log('Tags successfully synced');
        }
      } catch (e) {
        console.warn('Error processing tags:', e);
      }
    }

    // ───────────────────────────────────────────────
    // Apply update if there are fields to change
    // ───────────────────────────────────────────────
    if (Object.keys(updateData).length > 1 || tagsUpdated) {  // >1 because of updated_at
      const { data: updatedRow, error: updateError } = await supabase
        .from('content')
        .update(updateData)
        .eq('id', content_id)
        .select()
        .single();

      if (updateError) {
        console.error('Database update failed:', updateError.message);
        return new Response(
          JSON.stringify({ error: `Update failed: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Update successful');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Content updated',
          updated_fields: Object.keys(updateData),
          tags_updated: tagsUpdated,
          data: updatedRow,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ message: 'No changes to apply' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err: any) {
    console.error('Function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});