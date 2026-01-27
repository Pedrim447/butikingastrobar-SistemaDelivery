-- Atualizar política SELECT para não depender apenas do header
DROP POLICY IF EXISTS "View own orders" ON public.orders;

CREATE POLICY "View own orders"
ON public.orders
FOR SELECT
TO public
USING (
  -- Usuário autenticado vendo seus próprios pedidos
  ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()))
  OR
  -- Guest vendo pedidos via header x-guest-token
  ((guest_token IS NOT NULL) AND ((guest_token)::text = get_guest_token()))
  OR
  -- Guest vendo pedidos via validação direta do token (para .select() após INSERT)
  ((guest_token IS NOT NULL) AND validate_guest_token((guest_token)::text))
  OR
  -- Entregador vendo pedidos atribuídos
  ((auth.uid() IS NOT NULL) AND (delivery_rider_id = auth.uid()))
  OR
  -- Admin vendo todos
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- PDV vendo pedidos PDV
  (has_role(auth.uid(), 'pdv'::app_role) AND (tipo_pedido = 'pdv'::text))
);