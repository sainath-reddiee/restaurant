/*
  # Fix Admin Restaurant Insert Policy

  ## Changes
  - Drop and recreate the "Super admins can manage all restaurants" policy
  - Add explicit WITH CHECK clause for INSERT operations
  - This allows SUPER_ADMIN users to create new restaurants

  ## Security
  - Only users with role='SUPER_ADMIN' can insert restaurants
  - Policy checks profile role from the profiles table
*/

-- Drop the existing policy that was missing WITH CHECK
DROP POLICY IF EXISTS "Super admins can manage all restaurants" ON restaurants;

-- Recreate with proper WITH CHECK for INSERT operations
CREATE POLICY "Super admins can manage all restaurants"
  ON restaurants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );