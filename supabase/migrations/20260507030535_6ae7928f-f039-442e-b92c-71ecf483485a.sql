-- Categories table for custom + overrides
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earning','expense')),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📌',
  color TEXT NOT NULL DEFAULT '#6B7280',
  is_custom BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, key)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories: owner can select" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Categories: owner can insert" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Categories: owner can update" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Categories: owner can delete" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Dashboard preferences (visibility toggles) stored on user_settings as JSON
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS dashboard_widgets JSONB NOT NULL DEFAULT '{"goal":true,"stats":true,"byApp":true,"byExpense":true}'::jsonb;
