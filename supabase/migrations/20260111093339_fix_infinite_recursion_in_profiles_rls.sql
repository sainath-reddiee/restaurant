/*
  # Fix Infinite Recursion in Profiles RLS

  ## Problem
  The "Authenticated users can view profiles" policy causes infinite recursion
  because it queries the profiles table from within a profiles table policy.
  
  ## Solution
  1. Create a security definer function to check if user is super admin
  2. Update the SELECT policy to use this function instead of querying profiles
  3. Add an INSERT policy so users can create their own profile

  ## Changes
  - Drop existing problematic policy
  - Create `is_super_admin()` function with SECURITY DEFINER
  - Create new SELECT policy using the function
  - Add INSERT policy for profile creation
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Create a security definer function to check super admin status
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new SELECT policy without recursion
CREATE POLICY "Users can view own profile or super admin can view all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR public.is_super_admin()
  );

-- Add INSERT policy so users can create their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add DELETE policy for super admins only
CREATE POLICY "Super admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());
