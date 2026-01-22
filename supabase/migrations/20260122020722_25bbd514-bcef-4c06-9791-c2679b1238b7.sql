-- =====================================================
-- PHASE 1: Fix Critical RLS Policies
-- =====================================================

-- 1. Create helper function to get guest token from request headers
CREATE OR REPLACE FUNCTION public.get_guest_token()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('request.headers', true)::json->>'x-guest-token',
    ''
  )
$$;

-- =====================================================
-- 2. Fix guest_customers RLS Policies
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view their own guest data by token" ON public.guest_customers;
DROP POLICY IF EXISTS "Anyone can update their own guest data" ON public.guest_customers;

-- Create proper token-based policies
CREATE POLICY "Guests view own data by token"
ON public.guest_customers FOR SELECT
USING (
  guest_token::text = public.get_guest_token()
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Guests update own data by token"
ON public.guest_customers FOR UPDATE
USING (
  guest_token::text = public.get_guest_token()
);

-- =====================================================
-- 3. Fix orders RLS Policies
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Guests can view their orders by guest_token" ON public.orders;
DROP POLICY IF EXISTS "Guests can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "PDV users can view PDV orders" ON public.orders;
DROP POLICY IF EXISTS "Riders can view their assigned orders" ON public.orders;

-- Create consolidated view policy
CREATE POLICY "View own orders"
ON public.orders FOR SELECT
USING (
  auth.uid() = user_id
  OR guest_token::text = public.get_guest_token()
  OR auth.uid() = delivery_rider_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'pdv'::app_role) AND tipo_pedido = 'pdv')
);

-- Create insert policy - allow authenticated users, guests with token, or PDV
CREATE POLICY "Create orders"
ON public.orders FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR (guest_token IS NOT NULL AND guest_token::text != '')
  OR (has_role(auth.uid(), 'pdv'::app_role) AND tipo_pedido = 'pdv')
);

-- =====================================================
-- 4. Fix order_items RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- View order items only for orders user can access
CREATE POLICY "View order items for own orders"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      orders.user_id = auth.uid()
      OR orders.guest_token::text = public.get_guest_token()
      OR orders.delivery_rider_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR (has_role(auth.uid(), 'pdv'::app_role) AND orders.tipo_pedido = 'pdv')
    )
  )
);

-- Create order items only for orders user owns
CREATE POLICY "Create order items for own orders"
ON public.order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      orders.user_id = auth.uid()
      OR orders.guest_token::text = public.get_guest_token()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR (has_role(auth.uid(), 'pdv'::app_role) AND orders.tipo_pedido = 'pdv')
    )
  )
);

-- =====================================================
-- 5. Fix delivery_rider_locations RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view rider locations" ON public.delivery_rider_locations;

-- Customers can only see location for their order's assigned rider
CREATE POLICY "View rider location for own order"
ON public.delivery_rider_locations FOR SELECT
USING (
  auth.uid() = delivery_rider_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM orders
    WHERE orders.delivery_rider_id = delivery_rider_locations.delivery_rider_id
    AND orders.id = delivery_rider_locations.order_id
    AND orders.status = 'out_for_delivery'
    AND (
      orders.user_id = auth.uid()
      OR orders.guest_token::text = public.get_guest_token()
    )
  )
);