-- Remover policies que dependem de delivery_rider_id
DROP POLICY IF EXISTS "Riders can view their assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Riders can update their assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view rider locations" ON public.delivery_rider_locations;
DROP POLICY IF EXISTS "Riders can update their location" ON public.delivery_rider_locations;

-- Adicionar campos de delivery rider na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS delivery_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_active BOOLEAN DEFAULT true;

-- Migrar dados existentes de delivery_riders para profiles
UPDATE public.profiles p
SET 
  delivery_approved = COALESCE(dr.approved, false),
  delivery_active = COALESCE(dr.is_active, true)
FROM public.delivery_riders dr
WHERE p.id = dr.user_id;

-- Adicionar coluna delivery_rider_user_id nas tabelas
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_rider_user_id UUID;

-- Migrar dados de delivery_rider_id para delivery_rider_user_id
UPDATE public.orders o
SET delivery_rider_user_id = dr.user_id
FROM public.delivery_riders dr
WHERE o.delivery_rider_id = dr.id;

-- Atualizar delivery_rider_locations
ALTER TABLE public.delivery_rider_locations
ADD COLUMN IF NOT EXISTS delivery_rider_user_id UUID;

UPDATE public.delivery_rider_locations drl
SET delivery_rider_user_id = dr.user_id
FROM public.delivery_riders dr
WHERE drl.delivery_rider_id = dr.id;

-- Remover constraints antigas
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_delivery_rider_id_fkey;

ALTER TABLE public.delivery_rider_locations
DROP CONSTRAINT IF EXISTS delivery_rider_locations_delivery_rider_id_fkey;

-- Remover colunas antigas
ALTER TABLE public.orders
DROP COLUMN IF EXISTS delivery_rider_id;

ALTER TABLE public.delivery_rider_locations
DROP COLUMN IF EXISTS delivery_rider_id;

-- Renomear novas colunas
ALTER TABLE public.orders
RENAME COLUMN delivery_rider_user_id TO delivery_rider_id;

ALTER TABLE public.delivery_rider_locations
RENAME COLUMN delivery_rider_user_id TO delivery_rider_id;

-- Recriar policies usando user_id
CREATE POLICY "Riders can view their assigned orders"
ON public.orders
FOR SELECT
USING (auth.uid() = delivery_rider_id);

CREATE POLICY "Riders can update their assigned orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = delivery_rider_id);

CREATE POLICY "Anyone can view rider locations"
ON public.delivery_rider_locations
FOR SELECT
USING (true);

CREATE POLICY "Riders can update their location"
ON public.delivery_rider_locations
FOR ALL
USING (auth.uid() = delivery_rider_id);

-- Remover a tabela delivery_riders
DROP TABLE IF EXISTS public.delivery_riders CASCADE;