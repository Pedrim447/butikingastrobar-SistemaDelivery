-- Criar função auxiliar para validar guest token de forma segura
CREATE OR REPLACE FUNCTION public.validate_guest_token(token uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.guest_customers gc 
    WHERE gc.guest_token = token
  )
$$;

-- Remove a política atual
DROP POLICY IF EXISTS "Create orders" ON public.orders;

-- Cria nova política com função de validação robusta
CREATE POLICY "Create orders" ON public.orders
FOR INSERT WITH CHECK (
  -- Cenário 1: Usuário autenticado criando pedido para si mesmo
  (auth.uid() IS NOT NULL AND user_id = auth.uid() AND guest_token IS NULL)
  OR
  -- Cenário 2: Pedido de convidado (user_id DEVE ser NULL)
  (
    user_id IS NULL 
    AND guest_token IS NOT NULL 
    AND validate_guest_token(guest_token)
  )
  OR
  -- Cenário 3: PDV (pode não ter user_id nem guest_token)
  (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'pdv'::app_role) 
    AND tipo_pedido = 'pdv'::text
  )
  OR
  -- Cenário 4: Permitir pedidos anônimos (para fluxos de guest sem autenticação)
  (
    auth.uid() IS NULL
    AND user_id IS NULL 
    AND guest_token IS NOT NULL 
    AND validate_guest_token(guest_token)
  )
);