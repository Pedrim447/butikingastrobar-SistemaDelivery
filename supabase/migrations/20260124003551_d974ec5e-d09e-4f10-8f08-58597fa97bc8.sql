-- Add column to mark side dish as product
ALTER TABLE public.side_dishes ADD COLUMN show_as_product BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.side_dishes.show_as_product IS 'When true, this side dish also appears as a standalone product in the menu';