/*
  # Add GST Enable/Disable Toggle for Restaurants

  1. Changes
    - Add `gst_enabled` boolean column to `restaurants` table
    - Default to `false` for small restaurants below GST turnover threshold
    - Admin can enable this for restaurants that meet GST requirements

  2. Purpose
    - Some restaurants may not have the required turnover for GST registration
    - Allows admin to control GST calculations per restaurant
    - Provides flexibility for both GST-registered and non-GST restaurants

  3. Notes
    - GST registration is mandatory for businesses with turnover > ₹40 lakhs (service) or ₹20 lakhs (goods)
    - This field allows platform to support both types of restaurants
*/

-- Add gst_enabled column to restaurants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'gst_enabled'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN gst_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add helpful comment
COMMENT ON COLUMN restaurants.gst_enabled IS 'Whether GST calculations are enabled for this restaurant. Enable for restaurants with turnover above GST threshold.';

-- Update existing restaurants to have GST enabled by default
-- (can be changed by admin as needed)
UPDATE restaurants SET gst_enabled = true WHERE gst_enabled IS NULL;
