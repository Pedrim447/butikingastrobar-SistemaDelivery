-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can create guest customer" ON public.guest_customers;

-- Create a PERMISSIVE INSERT policy (default is PERMISSIVE)
CREATE POLICY "Anyone can create guest customer"
ON public.guest_customers
FOR INSERT
TO public
WITH CHECK (
  name IS NOT NULL AND 
  name <> '' AND 
  phone IS NOT NULL AND 
  phone <> ''
);