
-- Create campaign_settings table
CREATE TABLE public.campaign_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_voters integer NOT NULL DEFAULT 0,
  expected_turnout numeric NOT NULL DEFAULT 50,
  vote_share_needed numeric NOT NULL DEFAULT 50,
  contact_multiplier integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own campaign settings"
  ON public.campaign_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create donations table
CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  donor_name text NOT NULL DEFAULT '',
  donor_email text DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  frequency text DEFAULT 'one_time',
  status text DEFAULT 'completed',
  anedot_donation_id text DEFAULT '',
  raw_payload jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own donations"
  ON public.donations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow anedot webhook to insert donations (service role will be used)
CREATE POLICY "Allow anonymous inserts for webhooks"
  ON public.donations
  FOR INSERT
  TO anon
  WITH CHECK (true);
