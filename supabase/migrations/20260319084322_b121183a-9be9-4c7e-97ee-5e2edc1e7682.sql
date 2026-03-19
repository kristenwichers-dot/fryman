-- Texting campaigns table
CREATE TABLE public.texting_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  script_template text NOT NULL DEFAULT '',
  target_city text DEFAULT '',
  target_party text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.texting_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own texting campaigns" ON public.texting_campaigns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Supporter journeys table
CREATE TABLE public.supporter_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  supporter_type text NOT NULL DEFAULT 'volunteer',
  supporter_id uuid,
  journey_step text NOT NULL DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  triggered_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.supporter_journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own supporter journeys" ON public.supporter_journeys FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Automation logs table
CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  automation_type text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own automation logs" ON public.automation_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);