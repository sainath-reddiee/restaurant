/*
  # Add RIDER Role to User Role Enum

  ## Overview
  This migration adds the RIDER role to the user_role enum type.
  This must be done in a separate transaction before using the new value.

  ## Changes
  - Add 'RIDER' to user_role enum type
*/

-- Add RIDER to role enum
DO $$ 
BEGIN
  -- Check if RIDER role doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'RIDER' 
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'user_role'
    )
  ) THEN
    ALTER TYPE user_role ADD VALUE 'RIDER';
  END IF;
END $$;
