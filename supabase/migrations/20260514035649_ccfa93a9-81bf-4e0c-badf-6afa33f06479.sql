UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png','image/jpeg']
WHERE id = 'category-logos';