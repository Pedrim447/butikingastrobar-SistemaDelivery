import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Mapbox token is managed by edge functions, not needed in frontend
const MAPBOX_PUBLIC_TOKEN = "pk.mapbox_token_placeholder";

interface OrderTrackingMapProps {
  orderId: string;
  deliveryRiderId: string;
  destinationAddress: string;
}

interface Location {
  latitude: number;
  longitude: number;
}

interface Coordinates {
  lng: number;
  lat: number;
}

interface RouteGeometry {
  type: string;
  coordinates: number[][];
}

export const OrderTrackingMap: React.FC<OrderTrackingMapProps> = ({
  orderId,
  deliveryRiderId,
  destinationAddress,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const riderMarker = useRef<mapboxgl.Marker | null>(null);
  const destinationMarker = useRef<mapboxgl.Marker | null>(null);
  const [riderLocation, setRiderLocation] = useState<Location | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [fullRoute, setFullRoute] = useState<RouteGeometry | null>(null);
  const lastUpdateTime = useRef<number>(Date.now());

  // Geocode destination address
  useEffect(() => {
    const geocodeDestination = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mapbox-geocode`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address: destinationAddress }),
          }
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          setDestinationCoords({ lng, lat });
        }
      } catch (error) {
        console.error("Erro ao geocodificar endereço:", error);
      }
    };

    if (destinationAddress) {
      geocodeDestination();
    }
  }, [destinationAddress]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Use a public token for map display only (geocoding uses edge functions)
    mapboxgl.accessToken = "pk.eyJ1IjoibG92YWJsZS1kZXYiLCJhIjoiY20zeHhqc2N2MDNkajJqc2Q1ZzNsaDdnOSJ9.VZ8s8wF7JoRTLQpBdB7Wvg";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-44.3028, -2.5307], // São Luís default
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on('load', () => {
      setIsMapReady(true);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Add destination marker when coordinates are available
  useEffect(() => {
    if (!isMapReady || !map.current || !destinationCoords) return;

    // Remove old destination marker if exists
    if (destinationMarker.current) {
      destinationMarker.current.remove();
    }

    // Create destination marker with house icon
    const destEl = document.createElement("div");
    destEl.innerHTML = `
      <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C12.268 0 6 6.268 6 14C6 23.993 19.5 50 20 50C20.5 50 34 23.993 34 14C34 6.268 27.732 0 20 0Z" fill="#EF4444"/>
        <path d="M20 8L13 13V22H17V17H23V22H27V13L20 8Z" fill="white"/>
      </svg>
    `;
    destEl.style.width = "40px";
    destEl.style.height = "50px";
    destEl.style.cursor = "pointer";

    destinationMarker.current = new mapboxgl.Marker(destEl)
      .setLngLat([destinationCoords.lng, destinationCoords.lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>Destino</strong><br>${destinationAddress}`))
      .addTo(map.current);
  }, [isMapReady, destinationCoords, destinationAddress]);

  // Fetch rider location and subscribe to real-time updates
  useEffect(() => {
    if (!isMapReady) return;

    fetchRiderLocation();

    // Subscribe to real-time location updates for this specific order
    const channel = supabase
      .channel(`rider-location-${deliveryRiderId}-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_rider_locations",
          filter: `delivery_rider_id=eq.${deliveryRiderId}`,
        },
        (payload) => {
          console.log("🏍️ Real-time location update:", payload);
          if (payload.new && "latitude" in payload.new && "longitude" in payload.new) {
            // Only update if this location is for the current order
            if (payload.new.order_id === orderId) {
              updateRiderMarker(payload.new.latitude, payload.new.longitude);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Realtime subscription status:", status);
      });

    return () => {
      console.log("🔌 Unsubscribing from rider location updates");
      channel.unsubscribe();
    };
  }, [isMapReady, deliveryRiderId, orderId]);

  const fetchRiderLocation = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_rider_locations")
        .select("latitude, longitude")
        .eq("delivery_rider_id", deliveryRiderId)
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        updateRiderMarker(data.latitude, data.longitude);
      }
    } catch (error) {
      console.error("Error fetching rider location:", error);
    }
  };

  const calculateRemainingRoute = (fullRouteCoords: number[][], currentPosition: [number, number]) => {
    if (!fullRouteCoords || fullRouteCoords.length === 0) return fullRouteCoords;

    // Find the closest point on the route to current position
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < fullRouteCoords.length; i++) {
      const [lng, lat] = fullRouteCoords[i];
      const distance = Math.sqrt(
        Math.pow(lng - currentPosition[0], 2) + Math.pow(lat - currentPosition[1], 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    // Return route from closest point to destination
    return [[currentPosition[0], currentPosition[1]], ...fullRouteCoords.slice(closestIndex + 1)];
  };

  const drawRoute = async (riderLng: number, riderLat: number, forceNewRoute = false) => {
    if (!map.current || !destinationCoords) return;

    try {
      // Only fetch new route if we don't have one or if forced
      if (!fullRoute || forceNewRoute) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mapbox-directions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              startLng: riderLng,
              startLat: riderLat,
              endLng: destinationCoords.lng,
              endLat: destinationCoords.lat,
            }),
          }
        );
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          setFullRoute(data.routes[0].geometry);
        }
        return;
      }

      // Calculate remaining route based on current position
      const remainingCoords = calculateRemainingRoute(
        fullRoute.coordinates,
        [riderLng, riderLat]
      );

      // Remove existing route layers and source if they exist
      if (map.current.getLayer("route-outline")) {
        map.current.removeLayer("route-outline");
      }
      if (map.current.getLayer("route")) {
        map.current.removeLayer("route");
      }
      if (map.current.getSource("route")) {
        map.current.removeSource("route");
      }

      // Add remaining route to map
      map.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: remainingCoords,
          },
        },
      });

      // Add outline layer
      map.current.addLayer({
        id: "route-outline",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#FFFFFF",
          "line-width": 7,
          "line-opacity": 0.4,
        },
      });

      // Add main route layer
      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#8B5CF6",
          "line-width": 5,
          "line-opacity": 0.9,
        },
      });

      // Only fit bounds on first load
      if (forceNewRoute) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([riderLng, riderLat]);
        bounds.extend([destinationCoords.lng, destinationCoords.lat]);
        
        map.current.fitBounds(bounds, {
          padding: 80,
          maxZoom: 15,
        });
      }
    } catch (error) {
      console.error("Erro ao desenhar rota:", error);
    }
  };

  // Update route when fullRoute changes
  useEffect(() => {
    if (fullRoute && riderLocation && isMapReady) {
      drawRoute(riderLocation.longitude, riderLocation.latitude, true);
    }
  }, [fullRoute]);

  const updateRiderMarker = (latitude: number, longitude: number) => {
    if (!map.current) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime.current;

    // Throttle updates to avoid too frequent rendering (max every 500ms)
    if (timeSinceLastUpdate < 500 && riderLocation) {
      return;
    }

    lastUpdateTime.current = now;
    setRiderLocation({ latitude, longitude });

    // Remove old marker
    if (riderMarker.current) {
      riderMarker.current.remove();
    }

    // Create motorcycle marker element with animation
    const el = document.createElement("div");
    el.className = "rider-marker";
    el.innerHTML = `
      <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="25" cy="25" r="24" fill="#8B5CF6" stroke="white" stroke-width="2" class="animate-pulse"/>
        <g transform="translate(10, 13)">
          <path d="M20 11L17 11L15.5 7L11 7L11 9L14 9L15 11L12 11L10 15L14 15L16 18L18 18L20 11Z" fill="white"/>
          <circle cx="11" cy="19" r="3" fill="white"/>
          <circle cx="19" cy="19" r="3" fill="white"/>
          <path d="M13 11L16 11" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </g>
      </svg>
    `;
    el.style.width = "50px";
    el.style.height = "50px";
    el.style.cursor = "pointer";
    el.style.transition = "all 0.5s ease-out";

    // Add new marker with smooth animation
    riderMarker.current = new mapboxgl.Marker(el)
      .setLngLat([longitude, latitude])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML("<strong>🏍️ Entregador</strong><br>Localização em tempo real"))
      .addTo(map.current);

    // Update route - will use existing route and calculate remaining portion
    drawRoute(longitude, latitude, !fullRoute);
  };

  return (
    <div className="relative">
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        .rider-marker {
          animation: pulse 2s infinite;
        }
      `}</style>
      <div ref={mapContainer} className="h-[500px] rounded-lg shadow-lg" />
      {!riderLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground font-medium">
              🏍️ Aguardando localização do entregador em tempo real...
            </p>
          </div>
        </div>
      )}
      {riderLocation && (
        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Rastreamento ativo</span>
          </div>
        </div>
      )}
    </div>
  );
};