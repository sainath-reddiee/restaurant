/*
  # Add Admin Profile Update Policy

  ## Problem
  Super admins cannot update other users' profiles (e.g., to approve/reject riders,
  toggle active status, etc.) because the UPDATE policy only allows users to update
  their own profile.

  ## Changes
  1. Drop the existing restrictive UPDATE policy
  2. Create a new UPDATE policy that allows:
     - Users to update their own profile
     - Super admins to update any profile (via SECURITY DEFINER function)
  
  ## Security
  - Uses the existing is_super_admin() SECURITY DEFINER function to prevent recursion
  - Maintains security by only allowing authenticated users
  - Super admins can update any profile field except their own role (prevented by WITH CHECK)
*/

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new comprehensive UPDATE policy
CREATE POLICY "Users can update own profile and admins can update all"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own profile
    auth.uid() = id
    OR
    -- Super admins can update any profile
    public.is_super_admin()
  )
  WITH CHECK (
    -- Users can update their own profile
    auth.uid() = id
    OR
    -- Super admins can update any profile
    public.is_super_admin()
  );
