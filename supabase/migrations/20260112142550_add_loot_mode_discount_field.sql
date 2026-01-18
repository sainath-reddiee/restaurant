/*
  # Add Loot Mode Custom Discount Field

  1. Changes
    - Add `loot_discount_percentage` column to menu_items for custom discount offers
    - Add `loot_description` column for custom promotional text
    
  2. Purpose
    - Allow restaurant partners to set custom discount percentages for loot mode items
    - Enable promotional descriptions for mystery boxes
    - Automatically show discount savings to customers
*/

-- Add loot discount percentage field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'loot_discount_percentage'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN loot_discount_percentage integer DEFAULT 0;
    COMMENT ON COLUMN menu_items.loot_discount_percentage IS 'Custom discount percentage for loot mode (0-100). If 0, auto-calculated from base_price vs selling_price';
  END IF;
END $$;

-- Add loot description field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'loot_description'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN loot_description text;
    COMMENT ON COLUMN menu_items.loot_description IS 'Custom promotional description for loot mode items';
  END IF;
END $$;

-- Add constraint to ensure discount is between 0 and 100
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'menu_items_loot_discount_percentage_check'
  ) THEN
    ALTER TABLE menu_items ADD CONSTRAINT menu_items_loot_discount_percentage_check 
      CHECK (loot_discount_percentage >= 0 AND loot_discount_percentage <= 100);
  END IF;
END $$;