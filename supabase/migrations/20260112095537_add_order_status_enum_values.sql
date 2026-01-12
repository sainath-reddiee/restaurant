/*
  # Add Order Status Enum Values

  ## Overview
  Adds rider-related status values to order_status enum.
  Must be done in separate transaction before using values.

  ## Changes
  - Add 'SEARCHING_FOR_RIDER' to order_status enum
  - Add 'RIDER_ASSIGNED' to order_status enum
  - Add 'OUT_FOR_DELIVERY' to order_status enum
*/

-- Add new order statuses for rider system
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'SEARCHING_FOR_RIDER' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'SEARCHING_FOR_RIDER';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'RIDER_ASSIGNED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'RIDER_ASSIGNED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'OUT_FOR_DELIVERY' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'OUT_FOR_DELIVERY';
  END IF;
END $$;
