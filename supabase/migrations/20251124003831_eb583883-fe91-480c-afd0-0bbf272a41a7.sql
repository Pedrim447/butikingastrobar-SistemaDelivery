-- Enable realtime for delivery_rider_locations table
ALTER TABLE public.delivery_rider_locations REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'delivery_rider_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_rider_locations;
  END IF;
END $$;