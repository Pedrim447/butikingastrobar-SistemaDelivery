-- TESTE TEMPORÁRIO: Política totalmente permissiva para debugging
-- Vou adicionar uma política extra que permite INSERT de qualquer pessoa
-- para confirmar que o problema está na política

-- Primeiro, vou dropar a política existente e criar uma mais simples
DROP POLICY IF EXISTS "Create orders" ON public.orders;

-- Criar política permissiva para guest tokens (versão ULTRA simplificada)
CREATE POLICY "Create orders" ON public.orders
FOR INSERT WITH CHECK (
  -- Permitir se: 
  -- 1. Tem user_id válido
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  -- 2. É guest order - SIMPLIFICADO: apenas verifica se tem guest_token e existe no banco
  (user_id IS NULL AND guest_token IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.guest_customers gc WHERE gc.guest_token = orders.guest_token
  ))
  OR
  -- 3. É PDV
  (has_role(auth.uid(), 'pdv'::app_role) AND tipo_pedido = 'pdv'::text)
);