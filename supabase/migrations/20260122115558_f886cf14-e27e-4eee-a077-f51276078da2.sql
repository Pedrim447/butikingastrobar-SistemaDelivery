-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Insert guest customers" ON public.guest_customers;

-- Create new INSERT policy that allows anyone to insert
-- (with validation that name and phone are not empty)
CREATE POLICY "Anyone can create guest customer"
ON public.guest_customers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  name IS NOT NULL AND 
  name <> '' AND 
  phone IS NOT NULL AND 
  phone <> ''
);