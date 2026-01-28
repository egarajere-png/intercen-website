CREATE OR REPLACE FUNCTION reserve_stock(
  p_content_id UUID,
  p_quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  -- Get current stock with row lock
  SELECT stock_quantity INTO v_current_stock
  FROM content
  WHERE id = p_content_id
  FOR UPDATE;
  
  -- Check if sufficient stock
  IF v_current_stock >= p_quantity THEN
    -- Update stock
    UPDATE content
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_content_id;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;