import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MAPBOX_TOKEN = Deno.env.get('MAPBOX_PUBLIC_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('MAPBOX_TOKEN exists:', !!MAPBOX_TOKEN);
    
    const { startLng, startLat, endLng, endLat, profile = 'driving' } = await req.json();
    console.log('Directions request:', { startLng, startLat, endLng, endLat, profile });

    if (!startLng || !startLat || !endLng || !endLat) {
      return new Response(
        JSON.stringify({ error: 'All coordinates are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use traffic-aware routing to avoid blocked roads and congestion
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;
    console.log('Mapbox directions URL created with profile:', profile);
    
    const response = await fetch(url);
    console.log('Mapbox directions response status:', response.status);
    
    const data = await response.json();
    console.log('Mapbox directions response:', JSON.stringify(data).substring(0, 200));

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Directions error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
