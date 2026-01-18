/*
  # Recreate Restaurant Balance Increment Function

  1. Changes
    - Drop existing function if it exists
    - Create new function with correct parameter names
  
  2. New Functions
    - `increment_restaurant_balance` - Securely increments restaurant credit balance
      - Takes restaurant_id (uuid) and amount_to_add (integer) as parameters
      - Returns void
      - Bypasses RLS by running with SECURITY DEFINER
  
  3. Security
    - Function runs with SECURITY DEFINER (database owner privileges)
    - Only accessible via service role key in backend
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS increment_restaurant_balance(uuid, integer);

-- Create function to increment restaurant balance
CREATE OR REPLACE FUNCTION increment_restaurant_balance(
  restaurant_id uuid,
  amount_to_add integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the restaurant's credit balance
  UPDATE restaurants
  SET credit_balance = credit_balance + amount_to_add
  WHERE id = restaurant_id;

  -- Raise exception if restaurant not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Restaurant with ID % not found', restaurant_id;
  END IF;
END;
$$;