/*
  # Add Delivery Infrastructure - Final Schema

  ## Overview
  Completes delivery system infrastructure with all tables, columns, and policies.

  ## Changes
  1. Profile enhancements for riders
  2. Restaurant financial tracking
  3. Menu categories
  4. Reviews table
  5. Order rider assignments
  6. RLS policies
  7. Helper functions
*/

-- =====================================================
-- 1. UPDATE PROFILES TABLE (RIDER SUPPORT)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_rider_online'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_rider_online BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'rider_wallet_balance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN rider_wallet_balance INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'vehicle_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN vehicle_number TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_rider_online ON profiles(is_rider_online) WHERE role = 'RIDER';

COMMENT ON COLUMN profiles.is_rider_online IS 'Tracks whether rider is on duty and available for deliveries';
COMMENT ON COLUMN profiles.rider_wallet_balance IS 'Rider earnings balance in rupees (paisa)';
COMMENT ON COLUMN profiles.vehicle_number IS 'Rider vehicle registration number';

-- =====================================================
-- 2. UPDATE RESTAURANTS TABLE (FINANCIAL TRACKING)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'credit_balance'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN credit_balance INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'min_balance_limit'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN min_balance_limit INTEGER DEFAULT -500;
  END IF;
END $$;

COMMENT ON COLUMN restaurants.credit_balance IS 'Prepaid balance - decreases with each order fee deduction';
COMMENT ON COLUMN restaurants.min_balance_limit IS 'Minimum balance threshold before lockout (default: -500)';

-- =====================================================
-- 3. UPDATE MENU_ITEMS TABLE (CATEGORIES)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'category'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN category TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
COMMENT ON COLUMN menu_items.category IS 'Menu item category for filtering (e.g., Biryani, Starters, Drinks)';

-- =====================================================
-- 4. CREATE REVIEWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);

COMMENT ON TABLE reviews IS 'Customer reviews and ratings for restaurants';

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can create reviews for own orders"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.customer_id = auth.uid()
      AND orders.status = 'DELIVERED'
    )
  );

CREATE POLICY "Anyone can view reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Restaurant owners can view own reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      INNER JOIN profiles p ON r.owner_phone = p.phone
      WHERE r.id = reviews.restaurant_id
      AND p.id = auth.uid()
      AND p.role = 'RESTAURANT'
    )
  );

CREATE POLICY "Super admins can manage reviews"
  ON reviews
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- =====================================================
-- 5. UPDATE ORDERS TABLE (RIDER ASSIGNMENT)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'rider_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN rider_id UUID REFERENCES profiles(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_rider ON orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_searching ON orders(status) 
  WHERE status = 'SEARCHING_FOR_RIDER';

-- =====================================================
-- 6. RLS POLICIES FOR RIDERS
-- =====================================================

CREATE POLICY "Riders can view available and assigned orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'RIDER'
    )
    AND (
      status = 'SEARCHING_FOR_RIDER'
      OR rider_id = auth.uid()
    )
  );

CREATE POLICY "Riders can update assigned orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'RIDER'
    )
    AND (
      status = 'SEARCHING_FOR_RIDER'
      OR rider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'RIDER'
    )
  );

-- =====================================================
-- 7. CREATE HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_restaurant_average_rating(restaurant_uuid UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
  FROM reviews
  WHERE restaurant_id = restaurant_uuid;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_restaurant_average_rating IS 'Returns average rating for a restaurant (0 if no reviews)';

CREATE OR REPLACE FUNCTION deduct_restaurant_fee(
  p_restaurant_id UUID,
  p_order_id UUID,
  p_fee_amount INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE restaurants
  SET credit_balance = credit_balance - p_fee_amount
  WHERE id = p_restaurant_id
  RETURNING credit_balance INTO v_new_balance;

  INSERT INTO wallet_transactions (
    restaurant_id,
    type,
    amount,
    status,
    description
  ) VALUES (
    p_restaurant_id,
    'FEE_DEDUCTION',
    p_fee_amount,
    'APPROVED',
    'Order fee deduction for order: ' || p_order_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'fee_deducted', p_fee_amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION deduct_restaurant_fee IS 'Deducts ₹10 platform fee from restaurant credit balance when order is accepted';
