-- POLÍTICA TOTALMENTE PERMISSIVA - REMOVER TODAS AS RESTRIÇÕES DE INSERT

DROP POLICY IF EXISTS "Create orders" ON public.orders;

-- Permitir qualquer INSERT na tabela orders
CREATE POLICY "Create orders" ON public.orders
FOR INSERT WITH CHECK (true);