import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MAPBOX_TOKEN = Deno.env.get('MAPBOX_PUBLIC_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Brazilian states bounding boxes for validation (approximate)
const BR_STATE_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  'MA': { minLat: -10.5, maxLat: -1.0, minLng: -48.5, maxLng: -41.5 },
  'PI': { minLat: -11.0, maxLat: -2.5, minLng: -46.0, maxLng: -40.5 },
  'CE': { minLat: -8.0, maxLat: -2.5, minLng: -41.5, maxLng: -37.0 },
  'RN': { minLat: -7.0, maxLat: -4.5, minLng: -38.5, maxLng: -34.5 },
  'PB': { minLat: -8.5, maxLat: -6.0, minLng: -39.0, maxLng: -34.5 },
  'PE': { minLat: -10.0, maxLat: -7.0, minLng: -41.5, maxLng: -34.5 },
  'AL': { minLat: -10.5, maxLat: -8.5, minLng: -38.5, maxLng: -35.0 },
  'SE': { minLat: -11.5, maxLat: -9.5, minLng: -38.5, maxLng: -36.5 },
  'BA': { minLat: -18.5, maxLat: -8.5, minLng: -46.5, maxLng: -37.5 },
  'MG': { minLat: -23.0, maxLat: -14.0, minLng: -51.5, maxLng: -39.5 },
  'ES': { minLat: -21.5, maxLat: -17.5, minLng: -41.5, maxLng: -39.5 },
  'RJ': { minLat: -23.5, maxLat: -20.5, minLng: -45.0, maxLng: -40.5 },
  'SP': { minLat: -25.5, maxLat: -19.5, minLng: -53.5, maxLng: -44.0 },
  'PR': { minLat: -26.5, maxLat: -22.5, minLng: -55.0, maxLng: -48.0 },
  'SC': { minLat: -29.5, maxLat: -25.5, minLng: -54.0, maxLng: -48.0 },
  'RS': { minLat: -34.0, maxLat: -27.0, minLng: -57.5, maxLng: -49.5 },
  'MS': { minLat: -24.5, maxLat: -17.0, minLng: -58.0, maxLng: -53.5 },
  'MT': { minLat: -18.5, maxLat: -7.5, minLng: -61.5, maxLng: -50.0 },
  'GO': { minLat: -19.5, maxLat: -12.5, minLng: -53.5, maxLng: -45.5 },
  'DF': { minLat: -16.5, maxLat: -15.0, minLng: -48.5, maxLng: -47.0 },
  'TO': { minLat: -13.5, maxLat: -5.0, minLng: -51.0, maxLng: -45.5 },
  'PA': { minLat: -9.5, maxLat: 2.5, minLng: -58.5, maxLng: -46.0 },
  'AP': { minLat: -1.5, maxLat: 4.5, minLng: -54.5, maxLng: -49.5 },
  'AM': { minLat: -9.5, maxLat: 2.5, minLng: -73.5, maxLng: -56.0 },
  'RR': { minLat: -1.5, maxLat: 5.5, minLng: -65.0, maxLng: -58.5 },
  'RO': { minLat: -13.5, maxLat: -7.5, minLng: -66.5, maxLng: -59.5 },
  'AC': { minLat: -11.5, maxLat: -7.0, minLng: -74.0, maxLng: -66.5 },
};

function isCoordinateInState(lat: number, lng: number, state: string): boolean {
  const bounds = BR_STATE_BOUNDS[state.toUpperCase()];
  if (!bounds) return true; // If state not found, don't validate
  
  return lat >= bounds.minLat && lat <= bounds.maxLat && 
         lng >= bounds.minLng && lng <= bounds.maxLng;
}

function extractState(address: string): string | null {
  // Try to extract state from address like "São Luís - MA" or "MA, CEP"
  const patterns = [
    /\s-\s([A-Z]{2}),?\s/i,
    /,\s([A-Z]{2})\s-/i,
    /\s([A-Z]{2}),\sCEP/i,
    /\s([A-Z]{2})\sCEP/i,
  ];
  
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

function optimizeAddressForBrazil(address: string): string {
  // Remove "CEP" prefix as it can confuse geocoding
  let optimized = address.replace(/,?\s*CEP\s*/gi, ', ');
  
  // Remove "Brasil" as country is already set in API call
  optimized = optimized.replace(/,?\s*Brasil\s*$/i, '');
  
  // Clean up multiple commas and spaces
  optimized = optimized.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
  
  return optimized;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('MAPBOX_TOKEN exists:', !!MAPBOX_TOKEN);
    
    const { address } = await req.json();
    console.log('Original address:', address);

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expectedState = extractState(address);
    console.log('Expected state:', expectedState);

    // Optimize address for better geocoding results
    const optimizedAddress = optimizeAddressForBrazil(address);
    console.log('Optimized address:', optimizedAddress);

    // First attempt with optimized address
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(optimizedAddress)}.json?access_token=${MAPBOX_TOKEN}&country=BR&types=address,poi&limit=5`;
    console.log('Mapbox URL:', url.replace(MAPBOX_TOKEN || '', 'TOKEN_HIDDEN'));
    
    const response = await fetch(url);
    console.log('Mapbox response status:', response.status);
    
    const data = await response.json();
    console.log('Mapbox features count:', data.features?.length || 0);

    // Validate and filter results by state if we know the expected state
    if (data.features && data.features.length > 0 && expectedState) {
      const validFeatures = data.features.filter((feature: any) => {
        const [lng, lat] = feature.center;
        const isValid = isCoordinateInState(lat, lng, expectedState);
        console.log(`Feature "${feature.place_name}" at [${lat}, ${lng}] - Valid for ${expectedState}: ${isValid}`);
        return isValid;
      });
      
      if (validFeatures.length > 0) {
        console.log('Using validated features:', validFeatures.length);
        data.features = validFeatures;
      } else {
        console.log('No features matched state validation, trying fallback search...');
        
        // Fallback: search with just street + city + state
        const parts = address.split(',').map((p: string) => p.trim());
        const streetPart = parts[0] || '';
        const neighborhoodPart = parts[1] || '';
        
        // Try to find city in the address
        const cityMatch = address.match(/([^,]+)\s-\s[A-Z]{2}/i);
        const cityName = cityMatch ? cityMatch[1].trim() : '';
        
        const fallbackAddress = `${streetPart}, ${neighborhoodPart}, ${cityName}, ${expectedState}`;
        console.log('Fallback address:', fallbackAddress);
        
        const fallbackUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fallbackAddress)}.json?access_token=${MAPBOX_TOKEN}&country=BR&types=address,poi,neighborhood&limit=5`;
        
        const fallbackResponse = await fetch(fallbackUrl);
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.features && fallbackData.features.length > 0) {
          const validFallback = fallbackData.features.filter((feature: any) => {
            const [lng, lat] = feature.center;
            return isCoordinateInState(lat, lng, expectedState);
          });
          
          if (validFallback.length > 0) {
            console.log('Fallback found valid features:', validFallback.length);
            data.features = validFallback;
          }
        }
      }
    }

    // Log final result
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      console.log('Final geocode result:', { lat, lng, place_name: data.features[0].place_name });
    }

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
