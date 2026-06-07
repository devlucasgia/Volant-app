-- 1) Coluna de controle do passo de instalação no onboarding
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS install_prompt_seen boolean NOT NULL DEFAULT false;

-- 2) Tabela de log da régua de e-mails de trial
CREATE TABLE IF NOT EXISTS public.trial_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stage text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trial_email_log_stage_check CHECK (stage IN ('welcome','ending_soon','ended')),
  CONSTRAINT trial_email_log_user_stage_unique UNIQUE (user_id, stage)
);

GRANT SELECT, INSERT ON public.trial_email_log TO authenticated;
GRANT ALL ON public.trial_email_log TO service_role;

ALTER TABLE public.trial_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trial_email_log_owner_select"
  ON public.trial_email_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "trial_email_log_service_role_all"
  ON public.trial_email_log
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS trial_email_log_user_idx ON public.trial_email_log(user_id);