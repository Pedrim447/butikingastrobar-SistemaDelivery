-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Create orders" ON public.orders;

-- Create a PERMISSIVE policy for INSERT that allows all authenticated users, guests, and PDV users
CREATE POLICY "Create orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (true);
