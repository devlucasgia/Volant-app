
ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS account_email TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Feedback screenshots: users upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'feedback-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Feedback screenshots: users read own folder"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'feedback-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
