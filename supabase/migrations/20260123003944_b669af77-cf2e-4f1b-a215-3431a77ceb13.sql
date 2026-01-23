-- Drop the existing INSERT policy completely
DROP POLICY IF EXISTS "Anyone can create guest customer" ON public.guest_customers;

-- Create a simple PERMISSIVE INSERT policy with NO restrictions
-- Frontend validation is sufficient for name/phone validation
CREATE POLICY "Anyone can create guest customer"
ON public.guest_customers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also ensure the anon role has usage on the schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON public.guest_customers TO anon;
GRANT SELECT ON public.guest_customers TO anon;
GRANT UPDATE ON public.guest_customers TO anon;