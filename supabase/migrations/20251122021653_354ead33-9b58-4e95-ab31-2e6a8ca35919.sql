
-- Adiciona coluna user_id na tabela orders para vincular pedidos de usuários autenticados
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Cria índice para melhorar performance das buscas
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Atualiza RLS policies para permitir que usuários vejam seus próprios pedidos
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;

CREATE POLICY "Users can view their own orders"
ON orders
FOR SELECT
USING (
  auth.uid() = user_id OR
  guest_token IS NOT NULL OR
  has_role(auth.uid(), 'admin'::app_role)
);
