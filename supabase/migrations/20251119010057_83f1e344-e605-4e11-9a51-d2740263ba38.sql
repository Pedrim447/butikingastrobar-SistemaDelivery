-- Add delivery_rider role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'delivery_rider';

-- Create delivery_riders table
CREATE TABLE IF NOT EXISTS public.delivery_riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on delivery_riders
ALTER TABLE public.delivery_riders ENABLE ROW LEVEL SECURITY;

-- RLS policies for delivery_riders
CREATE POLICY "Admins can view all riders"
  ON public.delivery_riders
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert riders"
  ON public.delivery_riders
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update riders"
  ON public.delivery_riders
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Riders can view their own profile"
  ON public.delivery_riders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add delivery_rider_id to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_rider_id UUID REFERENCES public.delivery_riders(id);

-- Add cancellation_reason to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- RLS policy for delivery riders to view assigned orders
CREATE POLICY "Riders can view their assigned orders"
  ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_riders
      WHERE delivery_riders.user_id = auth.uid()
      AND delivery_riders.id = orders.delivery_rider_id
    )
  );

-- RLS policy for delivery riders to update their assigned orders
CREATE POLICY "Riders can update their assigned orders"
  ON public.orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_riders
      WHERE delivery_riders.user_id = auth.uid()
      AND delivery_riders.id = orders.delivery_rider_id
    )
  );

-- Trigger for delivery_riders updated_at
CREATE TRIGGER update_delivery_riders_updated_at
  BEFORE UPDATE ON public.delivery_riders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();