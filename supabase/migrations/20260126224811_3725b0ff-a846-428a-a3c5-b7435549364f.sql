-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Create orders" ON public.orders;

-- Create a more flexible INSERT policy that:
-- 1. Allows authenticated users to create orders with their user_id
-- 2. Allows anyone to create orders with a valid guest_token that exists in guest_customers table
-- 3. Allows PDV users to create PDV orders
CREATE POLICY "Create orders" ON public.orders
FOR INSERT WITH CHECK (
  -- Authenticated user creating order for themselves
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- Guest order: guest_token must exist in guest_customers table
  (
    guest_token IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.guest_customers gc 
      WHERE gc.guest_token = orders.guest_token
    )
  )
  OR
  -- PDV order
  (has_role(auth.uid(), 'pdv'::app_role) AND tipo_pedido = 'pdv'::text)
);