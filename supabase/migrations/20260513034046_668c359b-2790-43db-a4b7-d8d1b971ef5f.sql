
-- Remove restrictive check constraints to allow custom platforms and categories
ALTER TABLE public.entries DROP CONSTRAINT IF EXISTS entries_app_check;
ALTER TABLE public.entries DROP CONSTRAINT IF EXISTS entries_expense_category_check;

-- Add platform type (ride/simple) and optional image to categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS platform_type text NOT NULL DEFAULT 'ride',
  ADD COLUMN IF NOT EXISTS image_url text;

-- Storage bucket for custom platform/category logos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-logos', 'category-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Category logos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-logos');

-- Authenticated users can upload to their own folder (first path segment = user_id)
CREATE POLICY "Users can upload their own category logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'category-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own category logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'category-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own category logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'category-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
