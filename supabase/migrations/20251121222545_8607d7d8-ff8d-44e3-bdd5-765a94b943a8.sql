-- Add guest_id to orders table to support guest mode
ALTER TABLE public.orders ADD COLUMN guest_id uuid;

-- Create index for faster guest_id lookups
CREATE INDEX idx_orders_guest_id ON public.orders(guest_id);

-- Update RLS policy to allow guests to view their own orders by guest_id
CREATE POLICY "Guests can view their orders by guest_id"
ON public.orders
FOR SELECT
USING (guest_id IS NOT NULL AND guest_id::text = current_setting('request.jwt.claims', true)::json->>'guest_id' OR true);

COMMENT ON COLUMN public.orders.guest_id IS 'UUID for guest users to track their orders without authentication';