-- Add tracking_code to orders table
ALTER TABLE orders ADD COLUMN tracking_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_orders_tracking_code ON orders(tracking_code);

-- Create table for delivery rider real-time locations
CREATE TABLE delivery_rider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_rider_id UUID NOT NULL REFERENCES delivery_riders(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(delivery_rider_id, order_id)
);

-- Enable RLS
ALTER TABLE delivery_rider_locations ENABLE ROW LEVEL SECURITY;

-- Anyone can view locations (for customers to track)
CREATE POLICY "Anyone can view rider locations"
  ON delivery_rider_locations
  FOR SELECT
  USING (true);

-- Riders can insert/update their own location
CREATE POLICY "Riders can update their location"
  ON delivery_rider_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM delivery_riders
      WHERE delivery_riders.user_id = auth.uid()
      AND delivery_riders.id = delivery_rider_locations.delivery_rider_id
    )
  );

-- Enable realtime for locations
ALTER TABLE delivery_rider_locations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_rider_locations;

-- Function to generate unique tracking code
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM orders WHERE tracking_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Update existing orders with tracking codes
UPDATE orders SET tracking_code = generate_tracking_code() WHERE tracking_code IS NULL;