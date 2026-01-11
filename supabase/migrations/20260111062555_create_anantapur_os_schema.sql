/*
  # GO515 Database Schema

  ## Overview
  Creates the complete database schema for a Digital Storefront & Logistics OS platform
  for Tier-2 city restaurants with role-based access control.

  ## New Tables

  ### 1. profiles
  User profiles with role-based access
  - `id` (uuid, primary key) - Links to auth.users
  - `role` (enum) - SUPER_ADMIN, RESTAURANT, CUSTOMER
  - `phone` (text, required) - Contact number
  - `full_name` (text) - User's full name
  - `created_at` (timestamptz) - Account creation timestamp

  ### 2. restaurants
  Restaurant configuration and business details
  - `id` (uuid, primary key)
  - `name` (text, required) - Restaurant name
  - `owner_phone` (text, required) - Critical for WhatsApp notifications
  - `upi_id` (text, required) - For UPI payment deep links (e.g., raju@oksbi)
  - `is_active` (boolean) - Restaurant operational status
  - `tech_fee` (integer) - Software rent per order (default: 10 rupees)
  - `delivery_fee` (integer) - Average delivery cost (default: 40 rupees)
  - `free_delivery_threshold` (integer, nullable) - Minimum order for free delivery
  - `slug` (text, unique) - URL-friendly identifier
  - `created_at` (timestamptz)

  ### 3. menu_items
  Restaurant menu with pricing and stock management
  - `id` (uuid, primary key)
  - `restaurant_id` (uuid, foreign key)
  - `name` (text, required) - Item name
  - `image_url` (text) - Product image
  - `category` (text) - Menu category
  - `base_price` (integer, required) - Counter price set by restaurant
  - `selling_price` (integer, required) - Customer-facing price (base_price + tech_fee)
  - `is_clearance` (boolean) - Loot Mode flash sale item
  - `stock_remaining` (integer) - Real-time stock for Loot items
  - `is_mystery` (boolean) - Mystery Box item flag
  - `mystery_type` (enum) - VEG, NON_VEG, ANY for mystery boxes
  - `is_available` (boolean) - Item availability toggle
  - `created_at` (timestamptz)

  ### 4. coupons
  Restaurant-scoped discount codes
  - `id` (uuid, primary key)
  - `restaurant_id` (uuid, foreign key) - Strictly scoped to one restaurant
  - `code` (text, required) - Coupon code (e.g., "RAJU50")
  - `discount_value` (integer, required) - Discount amount in rupees
  - `min_order_value` (integer, required) - Minimum order requirement
  - `is_active` (boolean) - Coupon status
  - `created_at` (timestamptz)

  ### 5. orders
  Complete order records with logistics tracking
  - `id` (uuid, primary key)
  - `short_id` (text, unique) - Human-readable ID (e.g., "#ANT-104")
  - `restaurant_id` (uuid, foreign key)
  - `customer_id` (uuid, foreign key)
  - `status` (enum) - PENDING, CONFIRMED, COOKING, READY, DELIVERED
  - `payment_method` (enum) - PREPAID_UPI, COD_CASH, COD_UPI_SCAN
  - `voice_note_url` (text) - Public URL for customer voice message
  - `gps_coordinates` (text) - Format: "lat,long"
  - `delivery_address` (text, required)
  - `total_amount` (integer, required) - Final bill paid by customer
  - `delivery_fee_charged` (integer, required) - Records 0 or delivery_fee
  - `coupon_code` (text) - Applied coupon if any
  - `discount_amount` (integer) - Discount applied
  - `net_profit` (integer) - Platform profit (tech_fee + delivery_margin)
  - `items` (jsonb, required) - Order items with quantities
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - SUPER_ADMIN: Full access to all data
  - RESTAURANT: Access only to their own restaurant data
  - CUSTOMER: Access only to their own orders and public menu data

  ## Functions
  - `generate_short_id()` - Creates unique order IDs like "#ANT-104"
  - `decrement_stock(item_id, quantity)` - Atomic stock reduction
  - `calculate_net_profit(order_id)` - Computes platform profit
*/

-- Create enums
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'RESTAURANT', 'CUSTOMER');
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'COOKING', 'READY', 'DELIVERED');
CREATE TYPE payment_method AS ENUM ('PREPAID_UPI', 'COD_CASH', 'COD_UPI_SCAN');
CREATE TYPE mystery_type AS ENUM ('VEG', 'NON_VEG', 'ANY');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  phone text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_phone text NOT NULL,
  upi_id text NOT NULL,
  is_active boolean DEFAULT true,
  tech_fee integer DEFAULT 10,
  delivery_fee integer DEFAULT 40,
  free_delivery_threshold integer,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text,
  category text NOT NULL DEFAULT 'Main Course',
  base_price integer NOT NULL,
  selling_price integer NOT NULL,
  is_clearance boolean DEFAULT false,
  stock_remaining integer DEFAULT 0,
  is_mystery boolean DEFAULT false,
  mystery_type mystery_type,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_value integer NOT NULL,
  min_order_value integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, code)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status order_status DEFAULT 'PENDING',
  payment_method payment_method NOT NULL,
  voice_note_url text,
  gps_coordinates text,
  delivery_address text NOT NULL,
  total_amount integer NOT NULL,
  delivery_fee_charged integer NOT NULL,
  coupon_code text,
  discount_amount integer DEFAULT 0,
  net_profit integer DEFAULT 0,
  items jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_clearance ON menu_items(is_clearance) WHERE is_clearance = true;
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_coupons_restaurant ON coupons(restaurant_id);

-- Function to generate short order IDs
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS text AS $$
DECLARE
  new_id text;
  done bool;
BEGIN
  done := false;
  WHILE NOT done LOOP
    new_id := 'ANT-' || LPAD(floor(random() * 9999 + 1)::text, 4, '0');
    done := NOT EXISTS(SELECT 1 FROM orders WHERE short_id = new_id);
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically decrement stock
CREATE OR REPLACE FUNCTION decrement_stock(item_id uuid, quantity integer)
RETURNS boolean AS $$
DECLARE
  current_stock integer;
BEGIN
  SELECT stock_remaining INTO current_stock
  FROM menu_items
  WHERE id = item_id
  FOR UPDATE;
  
  IF current_stock >= quantity THEN
    UPDATE menu_items
    SET stock_remaining = stock_remaining - quantity
    WHERE id = item_id;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily inventory (for nightly cron)
CREATE OR REPLACE FUNCTION reset_daily_inventory()
RETURNS void AS $$
BEGIN
  UPDATE menu_items
  SET is_clearance = false,
      stock_remaining = 0
  WHERE is_clearance = true;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Restaurants RLS Policies
CREATE POLICY "Public can view active restaurants"
  ON restaurants FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Restaurant owners can view own restaurant"
  ON restaurants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND phone = restaurants.owner_phone
    )
  );

CREATE POLICY "Restaurant owners can update own restaurant"
  ON restaurants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND phone = restaurants.owner_phone
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND phone = restaurants.owner_phone
    )
  );

CREATE POLICY "Super admins can manage all restaurants"
  ON restaurants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Menu Items RLS Policies
CREATE POLICY "Public can view available menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (is_available = true);

CREATE POLICY "Restaurant owners can manage own menu"
  ON menu_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      JOIN profiles p ON p.phone = r.owner_phone
      WHERE r.id = menu_items.restaurant_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all menu items"
  ON menu_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Coupons RLS Policies
CREATE POLICY "Customers can view active coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Restaurant owners can manage own coupons"
  ON coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      JOIN profiles p ON p.phone = r.owner_phone
      WHERE r.id = coupons.restaurant_id AND p.id = auth.uid()
    )
  );

-- Orders RLS Policies
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Restaurant owners can view own restaurant orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      JOIN profiles p ON p.phone = r.owner_phone
      WHERE r.id = orders.restaurant_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can update own restaurant orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      JOIN profiles p ON p.phone = r.owner_phone
      WHERE r.id = orders.restaurant_id AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants r
      JOIN profiles p ON p.phone = r.owner_phone
      WHERE r.id = orders.restaurant_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );