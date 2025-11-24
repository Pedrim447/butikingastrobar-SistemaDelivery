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
      console.log("⚠️ Mapa ainda não está pronto");
      return;
    }

    console.log("🗺️ [Cliente] Mapa pronto, iniciando rastreamento do entregador");
    console.log("🗺️ Delivery Rider ID:", deliveryRiderId);
    
    // Buscar localização inicial
    fetchRiderLocation();

    // Configurar polling para atualizar localização a cada 5 segundos
    const intervalId = setInterval(() => {
      console.log("🔄 Atualizando localização do entregador (polling)");
      fetchRiderLocation();
    }, 5000);

    // Subscribe to real-time location updates for this delivery rider
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
          console.log("🏍️ [Cliente] Real-time location update:", payload);
          if (payload.new && "latitude" in payload.new && "longitude" in payload.new) {
            console.log("📍 Atualizando posição do entregador via realtime");
            updateRiderMarker(payload.new.latitude, payload.new.longitude);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 [Cliente] Realtime subscription status:", status);
      });

    return () => {
      console.log("🔌 Unsubscribing from rider location updates");
      clearInterval(intervalId);
      channel.unsubscribe();
    };
  }, [isMapReady, deliveryRiderId]);

  const fetchRiderLocation = async () => {
    try {
      console.log("🔍 Buscando localização do entregador:", deliveryRiderId, "para pedido:", orderId);
      
      const { data, error } = await supabase
        .from("delivery_rider_locations")
        .select("latitude, longitude")
        .eq("delivery_rider_id", deliveryRiderId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("❌ Erro ao buscar localização:", error);
        throw error;
      }

      if (data) {
        console.log("✅ Localização encontrada:", data);
        updateRiderMarker(data.latitude, data.longitude);
      } else {
        console.log("⚠️ Nenhuma localização encontrada para este entregador");
      }
    } catch (error) {
      console.error("❌ Error fetching rider location:", error);
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

    console.log("✅ Marcador do entregador adicionado ao mapa");

    // Update route - força nova rota se não existir
    const shouldForceNewRoute = !fullRoute;
    console.log("🛣️ Desenhando rota. Force new:", shouldForceNewRoute);
    drawRoute(longitude, latitude, shouldForceNewRoute);

    // Ajustar view do mapa para mostrar entregador e destino
    if (destinationCoords) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([longitude, latitude]);
      bounds.extend([destinationCoords.lng, destinationCoords.lat]);
      
      map.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 50, right: 50 },
        maxZoom: 15,
        duration: 1000,
      });
      console.log("🗺️ Mapa ajustado para mostrar entregador e destino");
    }
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