-- Remove a política atual com referência incorreta
DROP POLICY IF EXISTS "Create orders" ON public.orders;

-- Cria nova política com referência correta às colunas (sem prefixo "orders.")
CREATE POLICY "Create orders" ON public.orders
FOR INSERT WITH CHECK (
  -- Cenário 1: Usuário autenticado criando pedido
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Cenário 2: Pedido de convidado (sem orders. prefix na subquery)
  (
    user_id IS NULL 
    AND guest_token IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.guest_customers gc 
      WHERE gc.guest_token = guest_token
    )
  )
  OR
  -- Cenário 3: PDV
  (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'pdv'::app_role) 
    AND tipo_pedido = 'pdv'::text
  )
);