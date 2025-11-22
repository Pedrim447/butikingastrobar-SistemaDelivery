-- Create guest_customers table
CREATE TABLE IF NOT EXISTS public.guest_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  address_street text NOT NULL,
  address_number text NOT NULL,
  address_complement text,
  address_neighborhood text NOT NULL,
  address_city text NOT NULL,
  address_state text NOT NULL,
  address_cep text NOT NULL,
  converted_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guest_customers ENABLE ROW LEVEL SECURITY;

-- Policies for guest_customers
CREATE POLICY "Anyone can insert guest customers"
ON public.guest_customers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can view their own guest data by token"
ON public.guest_customers
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can update their own guest data"
ON public.guest_customers
FOR UPDATE
TO anon, authenticated
USING (true);

-- Admins can view all guest customers
CREATE POLICY "Admins can view all guest customers"
ON public.guest_customers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_guest_customers_updated_at
BEFORE UPDATE ON public.guest_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add guest_token to orders table for linking guest orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS guest_token uuid REFERENCES public.guest_customers(guest_token) ON DELETE SET NULL;

-- Update orders policies to allow guest orders
DROP POLICY IF EXISTS "Guests can view their orders by guest_id" ON public.orders;

CREATE POLICY "Guests can view their orders by guest_token"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (guest_token IS NOT NULL);

CREATE POLICY "Guests can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);