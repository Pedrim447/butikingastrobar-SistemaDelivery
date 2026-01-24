-- Create side_dishes table for managing accompaniments
CREATE TABLE public.side_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.side_dishes ENABLE ROW LEVEL SECURITY;

-- Everyone can view available side dishes
CREATE POLICY "Side dishes are viewable by everyone"
ON public.side_dishes
FOR SELECT
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert side dishes"
ON public.side_dishes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update side dishes"
ON public.side_dishes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete side dishes"
ON public.side_dishes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_side_dishes_updated_at
BEFORE UPDATE ON public.side_dishes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default side dishes
INSERT INTO public.side_dishes (name, price, display_order) VALUES
('Arroz Branco', 0, 1),
('Feijão', 0, 2),
('Farofa', 0, 3),
('Salada', 0, 4),
('Batata Frita', 0, 5),
('Purê de Batata', 0, 6),
('Vinagrete', 0, 7),
('Macarrão', 0, 8);