-- Add column to mark product as also showing as side dish/accompaniment
ALTER TABLE public.products ADD COLUMN show_as_side_dish BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.products.show_as_side_dish IS 'When true, this product also appears as an accompaniment option in other products';