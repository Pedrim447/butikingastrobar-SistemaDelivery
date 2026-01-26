-- Remove a política duplicada de PDV que pode estar causando conflito
DROP POLICY IF EXISTS "PDV users can create PDV orders" ON public.orders;

-- Recriar a política de INSERT com todas as condições corretas
DROP POLICY IF EXISTS "Create orders" ON public.orders;

CREATE POLICY "Create orders" ON public.orders
FOR INSERT WITH CHECK (
  -- Authenticated user creating order for themselves
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Guest order: guest_token must exist in guest_customers table
  (
    user_id IS NULL 
    AND guest_token IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.guest_customers gc 
      WHERE gc.guest_token = orders.guest_token
    )
  )
  OR
  -- PDV order: authenticated PDV user creating PDV order
  (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'pdv'::app_role) 
    AND tipo_pedido = 'pdv'::text
  )
);