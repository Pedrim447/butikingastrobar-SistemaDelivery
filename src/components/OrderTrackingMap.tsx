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
  const [fullAddress, setFullAddress] = useState<string>("");
  const lastUpdateTime = useRef<number>(Date.now());

  // Buscar detalhes do pedido para construir endereço completo
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const { data: orderData, error } = await supabase
          .from('orders')
          .select('customer_address, customer_neighborhood, customer_city, customer_state, customer_cep')
          .eq('id', orderId)
          .single();

        if (error) throw error;
        if (!orderData) return;

        // Construir endereço completo com CEP para geocoding preciso
        const completeAddress = `${orderData.customer_address}, ${orderData.customer_neighborhood}, ${orderData.customer_city} - ${orderData.customer_state}, CEP ${orderData.customer_cep}, Brasil`;
        setFullAddress(completeAddress);
      } catch (error) {
        console.error('Erro ao buscar detalhes do pedido:', error);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // Geocode destination address
  useEffect(() => {
    if (!fullAddress) return;

    const geocodeDestination = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mapbox-geocode`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address: fullAddress }),
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

    geocodeDestination();
  }, [fullAddress]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    
    console.log("🗺️ [Cliente] Inicializando mapa de rastreamento");
    console.log("Token exists:", !!mapboxToken);
    
    if (!mapboxToken) {
      console.error("❌ VITE_MAPBOX_PUBLIC_TOKEN não configurado");
      return;
    }

    console.log("🗺️ Inicializando mapa com token configurado");
    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-44.3028, -2.5307],
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on('load', () => {
      console.log("✅ [Cliente] Mapa carregado com sucesso");
      setIsMapReady(true);
    });

    map.current.on('error', (e) => {
      console.error("❌ [Cliente] Erro no mapa:", e);
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
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>Destino</strong><br>${fullAddress}`))
      .addTo(map.current);
  }, [isMapReady, destinationCoords, fullAddress]);

  // Fetch rider location and subscribe to real-time updates
  useEffect(() => {
    if (!isMapReady) {
      console.log("⚠️ [Cliente] Mapa ainda não está pronto");
      return;
    }

    console.log("🗺️ [Cliente] Mapa pronto, iniciando rastreamento do entregador");
    console.log("🗺️ [Cliente] Delivery Rider ID:", deliveryRiderId);
    console.log("🗺️ [Cliente] Order ID:", orderId);
    
    // Buscar localização inicial
    fetchRiderLocation();

    // Subscribe to real-time location updates via WebSocket
    console.log("📡 [Cliente] Configurando WebSocket subscription...");
    const channel = supabase
      .channel(`rider-location-${deliveryRiderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_rider_locations",
          filter: `delivery_rider_id=eq.${deliveryRiderId}`,
        },
        (payload) => {
          console.log("🏍️ [Cliente] Real-time location update via WebSocket:", payload);
          if (payload.new && "latitude" in payload.new && "longitude" in payload.new) {
            console.log("📍 [Cliente] Atualizando posição do entregador:", {
              lat: payload.new.latitude,
              lng: payload.new.longitude,
              order_id: payload.new.order_id
            });
            updateRiderMarker(payload.new.latitude, payload.new.longitude);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 [Cliente] Realtime WebSocket status:", status);
        if (status === 'SUBSCRIBED') {
          console.log("✅ [Cliente] WebSocket conectado com sucesso!");
        } else if (status === 'CHANNEL_ERROR') {
          console.error("❌ [Cliente] Erro no canal WebSocket");
        } else if (status === 'TIMED_OUT') {
          console.error("❌ [Cliente] WebSocket timeout");
        }
      });

    return () => {
      console.log("🔌 [Cliente] Unsubscribing from WebSocket");
      supabase.removeChannel(channel);
    };
  }, [isMapReady, deliveryRiderId, orderId]);

  const fetchRiderLocation = async () => {
    try {
      console.log("🔍 [Cliente] Buscando localização inicial do entregador");
      console.log("🔍 [Cliente] Delivery Rider ID:", deliveryRiderId);
      console.log("🔍 [Cliente] Order ID:", orderId);
      
      const { data, error } = await supabase
        .from("delivery_rider_locations")
        .select("latitude, longitude, updated_at, order_id")
        .eq("delivery_rider_id", deliveryRiderId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("❌ [Cliente] Erro ao buscar localização:", error);
        return;
      }

      if (data) {
        console.log("✅ [Cliente] Localização inicial encontrada:", {
          lat: data.latitude,
          lng: data.longitude,
          updated_at: data.updated_at,
          order_id: data.order_id
        });
        updateRiderMarker(data.latitude, data.longitude);
      } else {
        console.log("⚠️ [Cliente] Nenhuma localização encontrada para este entregador");
        console.log("⚠️ [Cliente] Aguardando primeira atualização via WebSocket...");
      }
    } catch (error) {
      console.error("❌ [Cliente] Error fetching rider location:", error);
    }
  };

  const drawRoute = async (riderLng: number, riderLat: number) => {
    if (!map.current || !destinationCoords) {
      console.log("⚠️ [Cliente] Não é possível desenhar rota - mapa ou destino não disponível");
      return;
    }

    try {
      console.log("🛣️ [Cliente] Buscando direções da API Mapbox");
      
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

      if (!data.routes || data.routes.length === 0) {
        console.error("❌ [Cliente] Nenhuma rota encontrada");
        return;
      }

      const route = data.routes[0].geometry;
      console.log("✅ [Cliente] Rota recebida com", route.coordinates.length, "pontos");

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

      // Add outline layer for better visibility
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
          "line-width": 8,
          "line-opacity": 0.5,
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

      console.log("✅ [Cliente] Rota desenhada no mapa");

      // Fit bounds to show entire route
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([riderLng, riderLat]);
      bounds.extend([destinationCoords.lng, destinationCoords.lat]);
      
      map.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 15,
        duration: 1000,
      });
      
    } catch (error) {
      console.error("❌ [Cliente] Erro ao desenhar rota:", error);
    }
  };

  // Draw route whenever rider location or destination changes
  useEffect(() => {
    if (riderLocation && destinationCoords && isMapReady && map.current) {
      console.log("🛣️ [Cliente] Trigger para desenhar rota - rider e destino disponíveis");
      drawRoute(riderLocation.longitude, riderLocation.latitude);
    }
  }, [riderLocation, destinationCoords, isMapReady]);

  const updateRiderMarker = (latitude: number, longitude: number) => {
    if (!map.current) {
      console.log("⚠️ Mapa não disponível para atualizar marcador");
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime.current;

    // Throttle updates to avoid too frequent rendering (max every 500ms)
    if (timeSinceLastUpdate < 500 && riderLocation) {
      console.log("⏭️ Pulando atualização (throttle)");
      return;
    }

    lastUpdateTime.current = now;
    console.log("📍 [Cliente] Atualizando marcador do entregador:", { latitude, longitude });
    setRiderLocation({ latitude, longitude });

    // Remove old marker
    if (riderMarker.current) {
      riderMarker.current.remove();
    }

    // Create motorcycle marker element with clean design
    const el = document.createElement("div");
    el.className = "rider-marker";
    el.style.width = "60px";
    el.style.height = "60px";
    el.style.cursor = "pointer";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    
    el.innerHTML = `
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Subtle shadow/glow effect -->
        <circle cx="30" cy="30" r="28" fill="#8B5CF6" opacity="0.15"/>
        
        <!-- Main motorcycle icon -->
        <g transform="translate(15, 18)">
          <!-- Motorcycle body -->
          <path d="M25 8L22 8L20 3L14 3L14 5.5L18 5.5L19.5 8L15 8L12 14L17 14L19.5 18L22 18L25 8Z" fill="#8B5CF6" stroke="#8B5CF6" stroke-width="0.5"/>
          
          <!-- Back wheel -->
          <circle cx="13" cy="20" r="4" fill="white" stroke="#8B5CF6" stroke-width="1.5"/>
          <circle cx="13" cy="20" r="2" fill="#8B5CF6"/>
          
          <!-- Front wheel -->
          <circle cx="23" cy="20" r="4" fill="white" stroke="#8B5CF6" stroke-width="1.5"/>
          <circle cx="23" cy="20" r="2" fill="#8B5CF6"/>
          
          <!-- Handlebar -->
          <path d="M19 8L22 8" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round"/>
          
          <!-- Rider (simplified) -->
          <circle cx="16" cy="6" r="2.5" fill="#8B5CF6"/>
        </g>
      </svg>
    `;

    // Add new marker with smooth animation
    riderMarker.current = new mapboxgl.Marker({ 
      element: el,
      anchor: 'center',
      rotationAlignment: 'map',
      pitchAlignment: 'map'
    })
      .setLngLat([longitude, latitude])
      .setPopup(new mapboxgl.Popup({ offset: 30 }).setHTML("<strong>🏍️ Entregador</strong><br>Localização em tempo real"))
      .addTo(map.current);

    console.log("✅ Marcador do entregador adicionado ao mapa");
  };

  return (
    <div className="relative">
      <style>{`
        .rider-marker {
          filter: drop-shadow(0 4px 6px rgba(139, 92, 246, 0.3));
        }
        .rider-marker:hover {
          filter: drop-shadow(0 6px 8px rgba(139, 92, 246, 0.5));
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
            <p className="text-xs text-muted-foreground mt-2">
              Pode levar alguns segundos para o mapa carregar
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