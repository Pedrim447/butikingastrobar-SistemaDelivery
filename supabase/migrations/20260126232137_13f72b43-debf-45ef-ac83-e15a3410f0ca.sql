-- ============================================
-- POLÍTICAS RLS SIMPLIFICADAS E ROBUSTAS
-- Corrige erro 42501 no checkout de convidados
-- ============================================

-- ETAPA 1: Atualizar política de INSERT em orders
-- Remove verificações de auth.uid() IS NULL/NOT NULL que causavam conflitos
DROP POLICY IF EXISTS "Create orders" ON public.orders;

CREATE POLICY "Create orders" ON public.orders
FOR INSERT WITH CHECK (
  -- Cenário 1: Usuário autenticado criando para si
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  -- Cenário 2: Pedido guest com token válido (INDEPENDE do estado de auth.uid)
  (user_id IS NULL AND guest_token IS NOT NULL AND validate_guest_token(guest_token))
  OR
  -- Cenário 3: PDV (has_role já valida internamente se uid existe)
  (has_role(auth.uid(), 'pdv'::app_role) AND tipo_pedido = 'pdv'::text)
);

-- ETAPA 2: Atualizar política de INSERT em order_items para consistência
DROP POLICY IF EXISTS "Create order items for own orders" ON public.order_items;

CREATE POLICY "Create order items for own orders" ON public.order_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND (
      o.user_id = auth.uid()
      OR (o.user_id IS NULL AND o.guest_token IS NOT NULL AND validate_guest_token(o.guest_token))
      OR (has_role(auth.uid(), 'pdv'::app_role) AND o.tipo_pedido = 'pdv'::text)
    )
  )
);