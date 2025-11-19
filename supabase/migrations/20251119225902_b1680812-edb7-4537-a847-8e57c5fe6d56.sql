-- Fix RLS policies for delivery_riders to allow admin creation via auth.admin.createUser

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert riders" ON public.delivery_riders;
DROP POLICY IF EXISTS "Admins can update riders" ON public.delivery_riders;
DROP POLICY IF EXISTS "Admins can view all riders" ON public.delivery_riders;
DROP POLICY IF EXISTS "Riders can view their own profile" ON public.delivery_riders;

-- Recreate policies with proper permissions
CREATE POLICY "Admins can insert riders"
ON public.delivery_riders
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update riders"
ON public.delivery_riders
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all riders"
ON public.delivery_riders
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Riders can view their own profile"
ON public.delivery_riders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow service role to bypass RLS for admin operations
ALTER TABLE public.delivery_riders FORCE ROW LEVEL SECURITY;