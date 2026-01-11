/*
  # Optimize RLS Policies and Fix Security Issues

  1. Performance Optimization
    - Replace all `auth.uid()` calls with `(select auth.uid())` in RLS policies
    - This prevents re-evaluation of auth.uid() for each row, dramatically improving performance at scale
    
  2. Security Fixes
    - Add explicit search_path to all functions to prevent search path injection attacks
    - Update is_super_admin() function to also use optimized auth.uid() call
    
  3. Changes Applied
    - profiles table: 2 policies optimized
    - restaurants table: 3 policies optimized  
    - menu_items table: 2 policies optimized
    - coupons table: 1 policy optimized
    - orders table: 4 policies optimized
    - All functions: search_path secured
*/

-- ============================================================================
-- STEP 1: Update is_super_admin() function for performance and security
-- ============================================================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = (select auth.uid())
    AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

-- ============================================================================
-- STEP 2: Fix function search paths for security
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_short_id() 
RETURNS text AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION reset_daily_inventory()
RETURNS void AS $$
BEGIN
  UPDATE menu_items 
  SET daily_stock_remaining = daily_stock_limit
  WHERE daily_stock_limit IS NOT NULL;
END;
$$ LANGUAGE plpgsql VOLATILE
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION decrement_stock(item_id uuid, quantity integer)
RETURNS boolean AS $$
DECLARE
  current_stock integer;
BEGIN
  SELECT daily_stock_remaining INTO current_stock
  FROM menu_items
  WHERE id = item_id;
  
  IF current_stock IS NULL OR current_stock >= quantity THEN
    UPDATE menu_items
    SET daily_stock_remaining = GREATEST(0, COALESCE(daily_stock_remaining, 999999) - quantity)
    WHERE id = item_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql VOLATILE
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'CUSTOMER')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- STEP 3: Optimize profiles table RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- STEP 4: Optimize restaurants table RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Restaurant owners can view own restaurant" ON restaurants;
CREATE POLICY "Restaurant owners can view own restaurant"
  ON restaurants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.phone = restaurants.owner_phone
    )
  );

DROP POLICY IF EXISTS "Restaurant owners can update own restaurant" ON restaurants;
CREATE POLICY "Restaurant owners can update own restaurant"
  ON restaurants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.phone = restaurants.owner_phone
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.phone = restaurants.owner_phone
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all restaurants" ON restaurants;
CREATE POLICY "Super admins can manage all restaurants"
  ON restaurants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- ============================================================================
-- STEP 5: Optimize menu_items table RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Restaurant owners can manage own menu" ON menu_items;
CREATE POLICY "Restaurant owners can manage own menu"
  ON menu_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM restaurants r
      JOIN profiles p ON p.phone = r.owner_phone
      WHERE r.id = menu_items.restaurant_id
      AND p.id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all menu items" ON menu_items;
CREATE POLICY "Super admins can manage all menu items"
  ON menu_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- ============================================================================
-- STEP 6: Optimize coupons table RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Restaurant owners can manage own coupons" ON coupons;
CREATE POLICY "Restaurant owners can manage own coupons"
  ON coupons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM restaurants r
      JOIN profiles p ON p.phone = r.owner_phone
      WHERE r.id = coupons.restaurant_id
      AND p.id = (select auth.uid())
    )
  );

-- ============================================================================
-- STEP 7: Optimize orders table RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
CREATE POLICY "Customers can view own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can create orders" ON orders;
CREATE POLICY "Customers can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Restaurant owners can view own restaurant orders" ON orders;
CREATE POLICY "Restaurant owners can view own restaurant orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM restaurants r
      JOIN profiles p ON p.phone = r.owner_phone
      WHERE r.id = orders.restaurant_id
      AND p.id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Restaurant owners can update own restaurant orders" ON orders;
CREATE POLICY "Restaurant owners can update own restaurant orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM restaurants r
      JOIN profiles p ON p.phone = r.owner_phone
      WHERE r.id = orders.restaurant_id
      AND p.id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM restaurants r
      JOIN profiles p ON p.phone = r.owner_phone
      WHERE r.id = orders.restaurant_id
      AND p.id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all orders" ON orders;
CREATE POLICY "Super admins can manage all orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'SUPER_ADMIN'
    )
  );
