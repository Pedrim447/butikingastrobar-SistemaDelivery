import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_PUBLIC_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

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

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize Mapbox
    mapboxgl.accessToken = MAPBOX_PUBLIC_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-46.6333, -23.5505], // São Paulo default
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add destination marker when coords are available
    if (destinationCoords && map.current) {
      const destEl = document.createElement("div");
      destEl.className = "destination-marker";
      destEl.style.backgroundImage = "url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDRDMTIuMjY4IDQgNiAxMC4yNjggNiAxOEM2IDI3Ljk5MyAxOS41IDE0MCAyMCAzNkMyMC41IDM2IDM0IDI3Ljk5MyAzNCAxOEMzNCAxMC4yNjggMjcuNzMyIDQgMjAgNFoiIGZpbGw9IiNFRjQ0NDQiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxOCIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+)";
      destEl.style.width = "40px";
      destEl.style.height = "40px";
      destEl.style.backgroundSize = "100%";

      destinationMarker.current = new mapboxgl.Marker(destEl)
        .setLngLat([destinationCoords.lng, destinationCoords.lat])
        .setPopup(new mapboxgl.Popup().setHTML("<strong>Destino</strong><br>" + destinationAddress))
        .addTo(map.current);
    }

    // Fetch initial location
    fetchRiderLocation();

    // Subscribe to real-time updates
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
      map.current?.remove();
    };
  }, [deliveryRiderId, orderId, destinationCoords]);

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

        // Remove existing route layer and source if they exist
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
            "line-width": 4,
            "line-opacity": 0.8,
          },
        });

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

    // Create custom marker element
    const el = document.createElement("div");
    el.className = "rider-marker";
    el.style.backgroundImage = "url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiM4QjVDRjYiLz4KPHBhdGggZD0iTTIwIDhWMTJNMjAgMjhWMzJNOCAyMEgxMk0yOCAyMEgzMk0yNC40ODUzIDI0LjQ4NTNMMjcuMzEzNyAyNy4zMTM3TTE1LjUxNDcgMTUuNTE0N0wxMi42ODYzIDEyLjY4NjNNMjQuNDg1MyAxNS41MTQ3TDI3LjMxMzcgMTIuNjg2M00xNS41MTQ3IDI0LjQ4NTNMMTIuNjg2MyAyNy4zMTM3IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K)";
    el.style.width = "40px";
    el.style.height = "40px";
    el.style.backgroundSize = "100%";

    // Add new marker
    riderMarker.current = new mapboxgl.Marker(el)
      .setLngLat([longitude, latitude])
      .setPopup(new mapboxgl.Popup().setHTML("<strong>Entregador</strong><br>Localização atual"))
      .addTo(map.current);

    // Draw route from rider to destination
    drawRoute(longitude, latitude);
  };

  return (
    <div className="relative">
      <div ref={mapContainer} className="h-[400px] rounded-lg" />
      {!riderLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Aguardando localização do entregador...
          </p>
        </div>
      )}
    </div>
  );
};