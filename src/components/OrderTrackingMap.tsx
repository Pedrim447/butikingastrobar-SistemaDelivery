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

  // Fetch rider location and subscribe to updates
  useEffect(() => {
    if (!isMapReady) return;

    fetchRiderLocation();

    const channel = supabase
      .channel("rider-location-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_rider_locations",
          filter: `delivery_rider_id=eq.${deliveryRiderId}`,
        },
        (payload) => {
          console.log("Location update:", payload);
          if (payload.new && "latitude" in payload.new && "longitude" in payload.new) {
            updateRiderMarker(payload.new.latitude, payload.new.longitude);
          }
        }
      )
      .subscribe();

    return () => {
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

  const drawRoute = async (riderLng: number, riderLat: number) => {
    if (!map.current || !destinationCoords) return;

    try {
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
        const route = data.routes[0].geometry;

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

        // Add route to map
        map.current.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: route,
          },
        });

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

        // Add a shadow/outline for the route
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
        }, "route");

        // Fit map to show both markers and route
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

  const updateRiderMarker = (latitude: number, longitude: number) => {
    if (!map.current) return;

    setRiderLocation({ latitude, longitude });

    // Remove old marker
    if (riderMarker.current) {
      riderMarker.current.remove();
    }

    // Create motorcycle marker element
    const el = document.createElement("div");
    el.innerHTML = `
      <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="25" cy="25" r="24" fill="#8B5CF6" stroke="white" stroke-width="2"/>
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
    el.style.animation = "pulse 2s infinite";

    // Add new marker
    riderMarker.current = new mapboxgl.Marker(el)
      .setLngLat([longitude, latitude])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML("<strong>🏍️ Entregador</strong><br>Localização em tempo real"))
      .addTo(map.current);

    // Draw route from rider to destination
    drawRoute(longitude, latitude);
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
      `}</style>
      <div ref={mapContainer} className="h-[500px] rounded-lg shadow-lg" />
      {!riderLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground font-medium">
              Aguardando localização do entregador...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};