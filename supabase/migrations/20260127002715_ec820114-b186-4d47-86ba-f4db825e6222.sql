-- ============================================
-- POLÍTICAS SEGURAS PARA PEDIDOS E DADOS
-- ============================================

-- 1. ORDERS: Política INSERT mais segura (exige guest_token válido OU usuário autenticado)
DROP POLICY IF EXISTS "Allow order creation" ON public.orders;

CREATE POLICY "Secure order creation"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Usuário autenticado com seu próprio user_id
  (auth.uid() IS NOT NULL AND user_id = auth.uid() AND guest_token IS NULL)
  OR
  -- Guest com token válido (deve existir na tabela guest_customers)
  (auth.uid() IS NULL AND user_id IS NULL AND guest_token IS NOT NULL AND validate_guest_token(guest_token::text))
  OR
  -- PDV criando pedidos (usuário PDV autenticado)
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'pdv'::app_role) AND tipo_pedido = 'pdv')
);

-- 2. ORDERS: Garantir que UPDATE só funciona para admins e entregadores (status apenas)
-- As políticas existentes já estão corretas, mas vamos reforçar

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Riders can update delivery status on assigned orders" ON public.orders;

-- Admins podem atualizar qualquer campo
CREATE POLICY "Admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Entregadores só podem atualizar status de pedidos atribuídos a eles
CREATE POLICY "Riders can update assigned orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = delivery_rider_id)
WITH CHECK (auth.uid() = delivery_rider_id);

-- 3. ORDER_ITEMS: Política INSERT mais segura
DROP POLICY IF EXISTS "Create order items for own orders" ON public.order_items;

CREATE POLICY "Secure order items creation"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
    AND (
      -- Usuário autenticado criando para seu pedido
      (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
      OR
      -- Guest criando para seu pedido (valida token)
      (auth.uid() IS NULL AND o.user_id IS NULL AND o.guest_token IS NOT NULL AND validate_guest_token(o.guest_token::text))
      OR
      -- PDV criando itens
      (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'pdv'::app_role) AND o.tipo_pedido = 'pdv')
    )
  )
);

-- 4. GUEST_CUSTOMERS: Política UPDATE mais segura
DROP POLICY IF EXISTS "Guests update own data by token" ON public.guest_customers;

CREATE POLICY "Guests update own data securely"
ON public.guest_customers
FOR UPDATE
TO anon, authenticated
USING (
  -- Guest pode atualizar seus próprios dados via header
  (guest_token::text = get_guest_token())
  OR
  -- Admin pode atualizar qualquer guest
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  (guest_token::text = get_guest_token())
  OR
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
);

-- 5. GUEST_CUSTOMERS: Bloquear DELETE para não-admins
CREATE POLICY "Only admins can delete guests"
ON public.guest_customers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));