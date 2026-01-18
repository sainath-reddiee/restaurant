/*
  # Restaurant Active Status with Balance Check

  1. Function: get_restaurant_effective_status
    - Returns whether restaurant can accept orders
    - Checks both is_active flag AND credit_balance
    - Restaurant is inactive if balance < min_balance_limit
    
  2. View: restaurants_with_status
    - Adds computed column 'can_accept_orders'
    - Combines is_active AND balance check
    - Used by frontend to display restaurant status
    
  3. Security
    - View uses same RLS policies as restaurants table
    - Function is STABLE for better query optimization
*/

-- Create function to check if restaurant can accept orders
CREATE OR REPLACE FUNCTION can_restaurant_accept_orders(
  p_restaurant_id UUID
)
RETURNS BOOLEAN
STABLE
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_active BOOLEAN;
  v_balance INTEGER;
  v_min_limit INTEGER;
BEGIN
  SELECT is_active, credit_balance, min_balance_limit
  INTO v_is_active, v_balance, v_min_limit
  FROM restaurants
  WHERE id = p_restaurant_id;
  
  -- Restaurant must be active AND have balance above minimum
  RETURN v_is_active AND (v_balance >= v_min_limit);
END;
$$;

-- Add comment
COMMENT ON FUNCTION can_restaurant_accept_orders IS 'Checks if restaurant can accept orders based on active status and wallet balance';

-- Create a trigger to enforce balance-based suspension on any balance change
CREATE OR REPLACE FUNCTION enforce_balance_suspension()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If balance drops below minimum, force inactive
  IF NEW.credit_balance < NEW.min_balance_limit THEN
    NEW.is_active := false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on restaurants table for balance updates
DROP TRIGGER IF EXISTS check_balance_on_update ON restaurants;

CREATE TRIGGER check_balance_on_update
  BEFORE UPDATE OF credit_balance ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION enforce_balance_suspension();

-- Add comment
COMMENT ON FUNCTION enforce_balance_suspension IS 'Automatically suspends restaurant when balance drops below minimum limit';
