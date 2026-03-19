
-- Add end_time to events
ALTER TABLE public.events ADD COLUMN end_time text DEFAULT '';

-- Create event_attachments table
CREATE TABLE public.event_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_path text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own event attachments"
  ON public.event_attachments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create event-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('event-attachments', 'event-attachments', false);

CREATE POLICY "Users upload event attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own event attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own event attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create media_contacts table
CREATE TABLE public.media_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  outlet text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own media contacts"
  ON public.media_contacts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
