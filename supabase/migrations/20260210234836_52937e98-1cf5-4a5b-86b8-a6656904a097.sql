
-- Create store_settings table for manual ordering control
CREATE TABLE public.store_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can view store settings"
ON public.store_settings FOR SELECT
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update store settings"
ON public.store_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert
CREATE POLICY "Admins can insert store settings"
ON public.store_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default setting (ordering enabled)
INSERT INTO public.store_settings (key, value) VALUES ('ordering_enabled', 'true');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
