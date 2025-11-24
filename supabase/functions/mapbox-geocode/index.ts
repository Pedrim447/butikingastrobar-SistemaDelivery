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
    console.log('MAPBOX_TOKEN length:', MAPBOX_TOKEN?.length);
    
    const { address } = await req.json();
    console.log('Geocoding address:', address);

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&country=BR`;
    console.log('Mapbox URL:', url.replace(MAPBOX_TOKEN || '', 'TOKEN_HIDDEN'));
    
    const response = await fetch(url);
    console.log('Mapbox response status:', response.status);
    
    const data = await response.json();
    console.log('Mapbox response:', JSON.stringify(data).substring(0, 200));

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Geocode error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
