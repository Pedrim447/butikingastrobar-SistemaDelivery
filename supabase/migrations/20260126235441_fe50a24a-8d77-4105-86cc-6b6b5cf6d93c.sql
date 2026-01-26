-- POLÍTICA RLS ROBUSTA PARA ORDERS

-- 1. DROP de todas as políticas existentes de INSERT
DROP POLICY IF EXISTS "Create orders" ON public.orders;

-- 2. Criar política de INSERT que funciona para TODOS os cenários
CREATE POLICY "Create orders" ON public.orders
FOR INSERT WITH CHECK (
  -- Cenário 1: Usuário autenticado criando pedido para si
  (user_id IS NOT NULL AND user_id = auth.uid() AND guest_token IS NULL)
  OR
  -- Cenário 2: Guest/Anônimo - user_id NULL, guest_token válido (existe na tabela)
  (user_id IS NULL AND guest_token IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.guest_customers gc WHERE gc.guest_token = orders.guest_token
  ))
  OR
  -- Cenário 3: PDV - usuário com role pdv criando pedido tipo pdv
  (has_role(auth.uid(), 'pdv'::app_role) AND tipo_pedido = 'pdv'::text)
);

-- 3. DROP e recriar política de SELECT
DROP POLICY IF EXISTS "View own orders" ON public.orders;

CREATE POLICY "View own orders" ON public.orders
FOR SELECT USING (
  -- Próprio usuário
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Guest via header token
  (guest_token IS NOT NULL AND (guest_token)::text = get_guest_token())
  OR
  -- Entregador do pedido
  (auth.uid() IS NOT NULL AND delivery_rider_id = auth.uid())
  OR
  -- Admin vê tudo
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- PDV vê pedidos PDV
  (has_role(auth.uid(), 'pdv'::app_role) AND tipo_pedido = 'pdv'::text)
);

-- 4. Manter políticas de UPDATE existentes (já estão corretas)
-- Admins can update orders - já existe
-- Riders can update delivery status - já existe