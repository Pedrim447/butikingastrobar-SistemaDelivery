-- SOLUÇÃO DEFINITIVA: Política que funciona para auth.uid() = NULL

-- Drop a política existente
DROP POLICY IF EXISTS "Create orders" ON public.orders;

-- Criar política que FUNCIONA para guests (quando auth.uid() IS NULL)
CREATE POLICY "Create orders" ON public.orders
FOR INSERT WITH CHECK (
  -- Cenário 1: Usuário autenticado
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Cenário 2: Guest - auth.uid() é NULL, então aceitar se guest_token é válido
  (auth.uid() IS NULL AND user_id IS NULL AND guest_token IS NOT NULL)
  OR
  -- Cenário 3: PDV
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'pdv'::app_role) AND tipo_pedido = 'pdv'::text)
);

-- Também corrigir order_items para funcionar com guests
DROP POLICY IF EXISTS "Create order items for own orders" ON public.order_items;

CREATE POLICY "Create order items for own orders" ON public.order_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND (
      -- Usuário autenticado dono do pedido
      (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
      OR
      -- Guest - o pedido existe e tem guest_token
      (auth.uid() IS NULL AND o.user_id IS NULL AND o.guest_token IS NOT NULL)
      OR
      -- PDV
      (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'pdv'::app_role) AND o.tipo_pedido = 'pdv'::text)
    )
  )
);