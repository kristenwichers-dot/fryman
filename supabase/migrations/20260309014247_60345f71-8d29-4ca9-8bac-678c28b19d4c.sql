
CREATE TABLE public.yard_sign_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  street_address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  delivered boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.yard_sign_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own yard sign requests"
  ON public.yard_sign_requests
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_yard_sign_requests_updated_at
  BEFORE UPDATE ON public.yard_sign_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
