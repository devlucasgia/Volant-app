-- Tighten storage SELECT policy on category-logos bucket.
-- Public URL/CDN access continues to work for public buckets even without a
-- broad SELECT policy on storage.objects, but listing via the API is blocked.
DROP POLICY IF EXISTS "Category logos are publicly readable" ON storage.objects;

-- Allow users to read (and therefore list) only their own files in this bucket.
CREATE POLICY "Users can read their own category logos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'category-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Restrict allowed mime types and file size at the bucket level (defense in depth).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp'],
    file_size_limit = 2 * 1024 * 1024
WHERE id = 'category-logos';