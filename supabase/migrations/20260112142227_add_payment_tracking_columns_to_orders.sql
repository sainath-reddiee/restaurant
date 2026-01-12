/*
  # Add Payment Tracking Columns to Orders

  1. Changes
    - Add `payment_transaction_id` column to store the transaction ID used for payment initiation
    - Add `payment_status` column to track payment lifecycle (pending/completed/failed)
    - Add `payment_merchant_transaction_id` column to store PhonePe merchant transaction ID
    
  2. Purpose
    - Enable proper tracking of payment status throughout the order lifecycle
    - Support mock payment gateway testing and real PhonePe integration
    - Link orders to payment transactions for verification
*/

-- Add payment_transaction_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_transaction_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_transaction_id text;
    COMMENT ON COLUMN orders.payment_transaction_id IS 'Transaction ID used to initiate payment (e.g., ORDER-{uuid}-{timestamp})';
  END IF;
END $$;

-- Add payment_status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status text DEFAULT 'pending';
    COMMENT ON COLUMN orders.payment_status IS 'Payment lifecycle status: pending, completed, failed';
  END IF;
END $$;

-- Add payment_merchant_transaction_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_merchant_transaction_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_merchant_transaction_id text;
    COMMENT ON COLUMN orders.payment_merchant_transaction_id IS 'PhonePe merchant transaction ID received from payment gateway';
  END IF;
END $$;

-- Create index for faster payment transaction lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_transaction_id 
  ON orders(payment_transaction_id);

CREATE INDEX IF NOT EXISTS idx_orders_payment_merchant_transaction_id 
  ON orders(payment_merchant_transaction_id);