/*
  # Prepaid Wallet Financial Module

  1. Restaurant Wallet Columns
    - Add `credit_balance` (integer, default 0) to restaurants table
    - Add `min_balance_limit` (integer, default -500) to restaurants table
    
  2. New Table: wallet_transactions
    - `id` (uuid, primary key)
    - `restaurant_id` (uuid, foreign key to restaurants)
    - `amount` (integer) - Positive for recharge, negative for fee deduction
    - `type` (enum: FEE_DEDUCTION, WALLET_RECHARGE)
    - `status` (enum: PENDING, APPROVED, REJECTED)
    - `proof_image_url` (text, nullable) - Payment screenshot for recharges
    - `created_at` (timestamptz)
    - `approved_by` (uuid, nullable) - Admin who approved
    - `approved_at` (timestamptz, nullable)
    
  3. Security
    - Enable RLS on wallet_transactions
    - Restaurant owners can view their own transactions (linked via phone number)
    - Restaurant owners can insert PENDING recharge requests
    - Super admins can view all transactions and update status
    - Fee deductions are system-generated only
    
  4. Notes
    - Restaurants can go into debt up to ₹500 (~50 orders) before suspension
    - Automatic fee deduction happens on order confirmation
    - Restaurant is auto-suspended when balance < min_balance_limit
*/

-- Add wallet columns to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS credit_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_balance_limit INTEGER DEFAULT -500;

-- Create wallet transaction type enum
DO $$ BEGIN
  CREATE TYPE wallet_transaction_type AS ENUM ('FEE_DEDUCTION', 'WALLET_RECHARGE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create wallet transaction status enum
DO $$ BEGIN
  CREATE TYPE wallet_transaction_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type wallet_transaction_type NOT NULL,
  status wallet_transaction_status NOT NULL DEFAULT 'PENDING',
  proof_image_url TEXT,
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Restaurant owners can view their own transactions (linked via phone)
CREATE POLICY "Restaurant owners can view own wallet transactions"
  ON wallet_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      INNER JOIN profiles p ON r.owner_phone = p.phone
      WHERE r.id = wallet_transactions.restaurant_id
      AND p.id = auth.uid()
      AND p.role = 'RESTAURANT'
    )
  );

-- Restaurant owners can create recharge requests only
CREATE POLICY "Restaurant owners can create recharge requests"
  ON wallet_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'WALLET_RECHARGE' 
    AND status = 'PENDING'
    AND EXISTS (
      SELECT 1 FROM restaurants r
      INNER JOIN profiles p ON r.owner_phone = p.phone
      WHERE r.id = wallet_transactions.restaurant_id
      AND p.id = auth.uid()
      AND p.role = 'RESTAURANT'
    )
  );

-- Super admins can view all transactions
CREATE POLICY "Super admins can view all wallet transactions"
  ON wallet_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- Super admins can approve/reject transactions
CREATE POLICY "Super admins can update wallet transactions"
  ON wallet_transactions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_restaurant ON wallet_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_credit_balance ON restaurants(credit_balance);

-- Add comment
COMMENT ON TABLE wallet_transactions IS 'Tracks all wallet transactions including fee deductions and recharges';
COMMENT ON COLUMN restaurants.credit_balance IS 'Current wallet balance. Negative values indicate debt';
COMMENT ON COLUMN restaurants.min_balance_limit IS 'Minimum balance before restaurant is suspended. Default -500 allows ₹500 debt';
