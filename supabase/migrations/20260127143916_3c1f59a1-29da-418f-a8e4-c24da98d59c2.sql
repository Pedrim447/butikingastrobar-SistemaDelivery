-- Create table for side dish variations (types)
CREATE TABLE public.side_dish_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  side_dish_id UUID NOT NULL REFERENCES public.side_dishes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.side_dish_variations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Variations are viewable by everyone"
ON public.side_dish_variations
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert variations"
ON public.side_dish_variations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update variations"
ON public.side_dish_variations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete variations"
ON public.side_dish_variations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add has_variations flag to side_dishes
ALTER TABLE public.side_dishes ADD COLUMN has_variations BOOLEAN DEFAULT false;

-- Trigger for updated_at
CREATE TRIGGER update_side_dish_variations_updated_at
  BEFORE UPDATE ON public.side_dish_variations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();