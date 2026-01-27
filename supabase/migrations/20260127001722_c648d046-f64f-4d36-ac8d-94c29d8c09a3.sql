-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Create orders" ON public.orders;

-- Create an explicitly PERMISSIVE policy for INSERT
CREATE POLICY "Allow order creation"
ON public.orders
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
