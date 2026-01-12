/*
  # Add GST Fields to Database

  1. Changes to `restaurants` table
    - Add `gst_number` (GST registration number)
    - Add `is_gst_registered` (boolean flag)
    - Add `food_gst_rate` (GST rate for food items, default 5%)

  2. Changes to `orders` table
    - Add GST amount fields for tracking
    - Add invoice number for GST compliance
    - Add breakdown fields for reporting

  3. New Functions
    - `generate_invoice_number()` - Generates sequential invoice numbers
    - Invoice format: INV/FY/000001 (e.g., INV/2025-2026/000123)

  4. Security
    - All fields accessible with existing RLS policies
*/

-- Add GST fields to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS gst_number VARCHAR(15),
ADD COLUMN IF NOT EXISTS is_gst_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS food_gst_rate DECIMAL(5,2) DEFAULT 5.00;

-- Add GST tracking fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS food_gst_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_gst_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_gst_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal_before_gst DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_sequence START 1000;

-- Function to generate invoice numbers
-- Format: INV/FY-YEAR/SEQUENCE
-- Example: INV/2025-2026/000123
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
  current_fy VARCHAR(10);
  invoice_year INTEGER;
BEGIN
  -- Determine financial year (April to March)
  invoice_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
    -- Apr-Dec: Current year to next year
    current_fy := invoice_year::TEXT || '-' || (invoice_year + 1)::TEXT;
  ELSE
    -- Jan-Mar: Previous year to current year
    current_fy := (invoice_year - 1)::TEXT || '-' || invoice_year::TEXT;
  END IF;
  
  next_val := nextval('invoice_sequence');
  
  RETURN 'INV/' || current_fy || '/' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN restaurants.gst_number IS 'Restaurant GST registration number (GSTIN)';
COMMENT ON COLUMN restaurants.is_gst_registered IS 'Whether restaurant is registered for GST';
COMMENT ON COLUMN restaurants.food_gst_rate IS 'GST rate applicable on food items (default 5%)';

COMMENT ON COLUMN orders.food_gst_amount IS 'GST amount on food items (5% GST)';
COMMENT ON COLUMN orders.delivery_gst_amount IS 'GST amount on delivery charges (18% GST)';
COMMENT ON COLUMN orders.total_gst_amount IS 'Total GST amount (food + delivery GST)';
COMMENT ON COLUMN orders.cgst_amount IS 'Central GST amount (50% of total GST)';
COMMENT ON COLUMN orders.sgst_amount IS 'State GST amount (50% of total GST)';
COMMENT ON COLUMN orders.subtotal_before_gst IS 'Subtotal amount before GST calculation';
COMMENT ON COLUMN orders.invoice_number IS 'GST-compliant invoice number';
