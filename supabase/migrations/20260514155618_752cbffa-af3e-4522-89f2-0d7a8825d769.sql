CREATE TABLE public.feedback_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  type text NOT NULL CHECK (type IN ('bug','suggestion')),
  title text NOT NULL,
  description text NOT NULL,
  contact_email text,
  app_version text,
  device_info text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedback: users can insert their own"
ON public.feedback_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Feedback: users can read their own"
ON public.feedback_reports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
