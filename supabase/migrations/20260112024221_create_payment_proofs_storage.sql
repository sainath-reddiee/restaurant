/*
  # Payment Proofs Storage Bucket

  1. Create Storage Bucket
    - Create 'payment-proofs' bucket for storing payment screenshots
    - Public bucket for easy viewing by admins
    
  2. Security
    - Restaurant owners can upload to their own folder
    - Super admins can view all proofs
    - Public read access for viewing proofs
*/

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow restaurant owners to upload payment proofs to their folder
CREATE POLICY "Restaurant owners can upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT r.id::text
    FROM restaurants r
    INNER JOIN profiles p ON r.owner_phone = p.phone
    WHERE p.id = auth.uid()
    AND p.role = 'RESTAURANT'
  )
);

-- Allow public read access to payment proofs
CREATE POLICY "Public can view payment proofs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'payment-proofs');

-- Allow restaurant owners to delete their own proofs
CREATE POLICY "Restaurant owners can delete own payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT r.id::text
    FROM restaurants r
    INNER JOIN profiles p ON r.owner_phone = p.phone
    WHERE p.id = auth.uid()
    AND p.role = 'RESTAURANT'
  )
);

-- Allow super admins to manage all payment proofs
CREATE POLICY "Super admins can manage payment proofs"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'SUPER_ADMIN'
  )
);
