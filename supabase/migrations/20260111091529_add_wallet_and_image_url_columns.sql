/*
  # Add Wallet Balance and Restaurant Image URL

  ## Changes Made

  1. **Add wallet_balance to profiles table**
     - Column: wallet_balance (integer, default: 0)
     - Purpose: Store refunds and rewards credits for customers
     - Security: Only used for crediting money, not adding money directly

  2. **Add image_url to restaurants table**
     - Column: image_url (text, nullable)
     - Purpose: Store restaurant logo/banner image URL

  ## Important Notes

  - Wallet balance can only be used to reduce payment amounts
  - Customers cannot directly add money to wallet
  - Wallet is credited through refunds and platform rewards only
*/

-- Add wallet_balance column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'wallet_balance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN wallet_balance integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add image_url column to restaurants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN image_url text;
  END IF;
END $$;

-- Add constraint to ensure wallet_balance is never negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallet_balance_non_negative'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT wallet_balance_non_negative CHECK (wallet_balance >= 0);
  END IF;
END $$;
