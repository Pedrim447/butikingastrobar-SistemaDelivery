-- GRANT permissões de tabela para orders
-- Isso é NECESSÁRIO para que RLS funcione - RLS filtra, mas GRANT permite acesso

GRANT SELECT, INSERT, UPDATE ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

-- Também garantir que order_items tem as permissões
GRANT SELECT, INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT ON public.order_items TO authenticated;