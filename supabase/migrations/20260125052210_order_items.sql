-- ============================================
-- 2. Order Items Table (if not exists)
-- ============================================
-- This table is referenced in the delete function to check purchases
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT order_items_price_positive CHECK (unit_price >= 0 AND total_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order 
    ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_content 
    ON public.order_items(content_id);