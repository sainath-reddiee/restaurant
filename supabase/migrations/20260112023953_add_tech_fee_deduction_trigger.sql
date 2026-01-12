/*
  # Automatic Tech Fee Deduction System

  1. Function: process_tech_fee_deduction
    - Triggered when order status changes to CONFIRMED
    - Deducts tech_fee from restaurant's credit_balance
    - Creates a FEE_DEDUCTION transaction record
    - Auto-suspends restaurant if balance < min_balance_limit
    
  2. Trigger: on_order_confirmed
    - Fires AFTER UPDATE on orders table
    - Only when status changes to 'CONFIRMED'
    
  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only triggered by database events, not directly callable
    
  4. Logic Flow
    - Get tech_fee from restaurants table
    - Update credit_balance = credit_balance - tech_fee
    - Insert wallet_transaction (type: FEE_DEDUCTION, status: APPROVED)
    - If new balance < min_balance_limit, set is_active = false
*/

-- Create function to process tech fee deduction
CREATE OR REPLACE FUNCTION process_tech_fee_deduction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_tech_fee INTEGER;
  v_new_balance INTEGER;
  v_min_limit INTEGER;
BEGIN
  -- Only process if status changed to CONFIRMED
  IF NEW.status = 'CONFIRMED' AND (OLD.status IS NULL OR OLD.status != 'CONFIRMED') THEN
    
    -- Get restaurant's tech_fee, current balance, and min_limit
    SELECT tech_fee, credit_balance, min_balance_limit
    INTO v_tech_fee, v_new_balance, v_min_limit
    FROM restaurants
    WHERE id = NEW.restaurant_id;
    
    -- Skip if tech_fee is null or zero
    IF v_tech_fee IS NULL OR v_tech_fee = 0 THEN
      RETURN NEW;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_new_balance - v_tech_fee;
    
    -- Update restaurant's credit_balance
    UPDATE restaurants
    SET credit_balance = v_new_balance
    WHERE id = NEW.restaurant_id;
    
    -- Insert fee deduction transaction
    INSERT INTO wallet_transactions (
      restaurant_id,
      amount,
      type,
      status,
      notes,
      created_at
    ) VALUES (
      NEW.restaurant_id,
      -v_tech_fee,
      'FEE_DEDUCTION',
      'APPROVED',
      'Tech fee for order ' || NEW.short_id,
      now()
    );
    
    -- Check if restaurant should be suspended
    IF v_new_balance < v_min_limit THEN
      UPDATE restaurants
      SET is_active = false
      WHERE id = NEW.restaurant_id;
      
      -- Log suspension in notes
      UPDATE restaurants
      SET is_active = false
      WHERE id = NEW.restaurant_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS on_order_confirmed ON orders;

CREATE TRIGGER on_order_confirmed
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION process_tech_fee_deduction();

-- Add comment
COMMENT ON FUNCTION process_tech_fee_deduction IS 'Automatically deducts tech_fee from restaurant wallet when order is confirmed';
