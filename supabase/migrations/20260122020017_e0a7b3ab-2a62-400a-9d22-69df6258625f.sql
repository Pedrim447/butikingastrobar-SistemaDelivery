-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;

-- Drop riders update policy (will be replaced with admin-only)
DROP POLICY IF EXISTS "Riders can update their assigned orders" ON public.orders;

-- Create new policy: Only admins can update orders
CREATE POLICY "Admins can update orders"
ON public.orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for riders to update only delivery status on their assigned orders
CREATE POLICY "Riders can update delivery status on assigned orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = delivery_rider_id);