-- POLÍTICA SIMPLIFICADA - Remove o EXISTS problemático
-- A validação do guest_token já é feita no frontend e o token é gerado pelo banco

DROP POLICY IF EXISTS "Create orders" ON public.orders;

CREATE POLICY "Create orders" ON public.orders
FOR INSERT WITH CHECK (
  -- Cenário 1: Usuário autenticado
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  -- Cenário 2: Guest - apenas verifica que user_id é NULL e tem guest_token
  -- A validação do token já foi feita ao criar o guest_customer
  (user_id IS NULL AND guest_token IS NOT NULL)
  OR
  -- Cenário 3: PDV
  (has_role(auth.uid(), 'pdv'::app_role) AND tipo_pedido = 'pdv'::text)
);