-- Fix function search path issues for functions without search_path set

-- Fix generate_tracking_code function
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM orders WHERE tracking_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$function$;

-- Drop the overly permissive INSERT policy on guest_customers
DROP POLICY IF EXISTS "Anyone can insert guest customers" ON public.guest_customers;

-- Create proper INSERT policy for guest_customers
CREATE POLICY "Insert guest customers"
ON public.guest_customers FOR INSERT
WITH CHECK (
  -- Allow insert if name and phone are provided (basic validation)
  name IS NOT NULL AND name != '' AND phone IS NOT NULL AND phone != ''
);