-- Step 2: Add PDV-specific columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tipo_pedido text DEFAULT 'online',
ADD COLUMN IF NOT EXISTS peso_kg numeric,
ADD COLUMN IF NOT EXISTS preco_kg numeric,
ADD COLUMN IF NOT EXISTS valor_prato numeric,
ADD COLUMN IF NOT EXISTS comanda_id text;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_orders_tipo_pedido ON orders(tipo_pedido);

-- Add RLS policy for PDV users to create and view PDV orders
CREATE POLICY "PDV users can create PDV orders"
ON orders
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'pdv'::app_role) 
  AND tipo_pedido = 'pdv'
);

CREATE POLICY "PDV users can view PDV orders"
ON orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pdv'::app_role) 
  AND tipo_pedido = 'pdv'
);

-- Function to generate comanda number
CREATE OR REPLACE FUNCTION public.generate_comanda_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  prefix TEXT := 'CMD';
  num TEXT;
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate sequential number based on today's orders
    SELECT LPAD(
      (COUNT(*) + 1)::text, 
      4, 
      '0'
    ) INTO num
    FROM orders 
    WHERE tipo_pedido = 'pdv' 
    AND DATE(created_at) = CURRENT_DATE;
    
    code := prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || num;
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM orders WHERE comanda_id = code
    ) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$function$;