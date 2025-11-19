import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface OrderTrackingMapProps {
  orderId: string;
  deliveryRiderId: string;
  destinationAddress: string;
}

interface Location {
  latitude: number;
  longitude: number;
}

export const OrderTrackingMap: React.FC<OrderTrackingMapProps> = ({
  orderId,
  deliveryRiderId,
  destinationAddress,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const riderMarker = useRef<mapboxgl.Marker | null>(null);
  const [riderLocation, setRiderLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize Mapbox
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || "";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-46.6333, -23.5505], // São Paulo default
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

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
  }, [deliveryRiderId, orderId]);

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

    // Center map on rider
    map.current.flyTo({
      center: [longitude, latitude],
      zoom: 15,
    });
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