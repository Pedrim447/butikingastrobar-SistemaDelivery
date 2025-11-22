-- Adicionar campo de aprovação na tabela delivery_riders
ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- Criar índice para melhorar performance nas consultas de aprovação
CREATE INDEX IF NOT EXISTS idx_delivery_riders_approved ON delivery_riders(approved);