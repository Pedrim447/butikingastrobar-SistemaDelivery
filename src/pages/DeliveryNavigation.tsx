import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Navigation, CheckCircle, XCircle, Phone } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_neighborhood: string;
  customer_city: string;
  customer_state: string;
  customer_cep: string;
  total: number;
}

export default function DeliveryNavigation() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const riderMarker = useRef<mapboxgl.Marker | null>(null);
  const destinationMarker = useRef<mapboxgl.Marker | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const { position } = useGeolocation(true);
  const [cancellationReason, setCancellationReason] = useState("");

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          navigate("/auth");
          return;
        }

        const { data: riderData } = await supabase
          .from("delivery_riders")
          .select("id")
          .eq("user_id", userData.user.id)
          .single();

        if (!riderData) {
          toast.error("Você não é um entregador cadastrado");
          navigate("/");
          return;
        }

        setRiderId(riderData.id);

        const { data: orderData, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .eq("delivery_rider_id", riderData.id)
          .single();

        if (error || !orderData) {
          toast.error("Pedido não encontrado");
          navigate("/entregas");
          return;
        }

        setOrder(orderData);
      } catch (error) {
        console.error("Erro ao buscar pedido:", error);
        toast.error("Erro ao carregar pedido");
      }
    };

    fetchOrder();
  }, [orderId, navigate]);

  // Geocode destination
  useEffect(() => {
    if (!order) return;

    const geocodeDestination = async () => {
      try {
        const address = `${order.customer_address}, ${order.customer_neighborhood}, ${order.customer_city} - ${order.customer_state}`;
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mapbox-geocode`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address }),
          }
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          setDestinationCoords([lng, lat]);
        }
      } catch (error) {
        console.error("Erro ao geocodificar endereço:", error);
      }
    };

    geocodeDestination();
  }, [order]);

  // Initialize 3D map
  useEffect(() => {
    if (!mapContainer.current) return;

    const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    
    if (!mapboxToken) {
      console.error("❌ VITE_MAPBOX_PUBLIC_TOKEN não configurado");
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/navigation-day-v1",
      center: [-44.3028, -2.5307],
      zoom: 15,
      pitch: 60, // 3D perspective
      bearing: 0,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      "top-right"
    );

    // Add 3D buildings layer
    map.current.on('load', () => {
      setIsMapReady(true);
      
      const layers = map.current!.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
      )?.id;

      map.current!.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
          }
        },
        labelLayerId
      );
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Add destination marker
  useEffect(() => {
    if (!isMapReady || !map.current || !destinationCoords) return;

    if (destinationMarker.current) {
      destinationMarker.current.remove();
    }

    const destEl = document.createElement("div");
    destEl.innerHTML = `
      <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C12.268 0 6 6.268 6 14C6 23.993 19.5 50 20 50C20.5 50 34 23.993 34 14C34 6.268 27.732 0 20 0Z" fill="#EF4444"/>
        <path d="M20 8L13 13V22H17V17H23V22H27V13L20 8Z" fill="white"/>
      </svg>
    `;
    destEl.style.width = "40px";
    destEl.style.height = "50px";

    destinationMarker.current = new mapboxgl.Marker(destEl)
      .setLngLat(destinationCoords)
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>Destino</strong><br>${order?.customer_address}`))
      .addTo(map.current);
  }, [isMapReady, destinationCoords, order]);

  // Update rider marker and draw route
  useEffect(() => {
    if (!isMapReady || !map.current || !position || !destinationCoords || !riderId || !orderId) return;

    // Update rider location in database
    const updateLocation = async () => {
      try {
        await supabase.from("delivery_rider_locations").upsert({
          delivery_rider_id: riderId,
          order_id: orderId,
          latitude: position.latitude,
          longitude: position.longitude,
        });
      } catch (error) {
        console.error("Erro ao atualizar localização:", error);
      }
    };

    updateLocation();

    // Update rider marker
    if (riderMarker.current) {
      riderMarker.current.setLngLat([position.longitude, position.latitude]);
    } else {
      const riderEl = document.createElement("div");
      riderEl.innerHTML = `
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
      riderEl.style.width = "50px";
      riderEl.style.height = "50px";

      riderMarker.current = new mapboxgl.Marker(riderEl)
        .setLngLat([position.longitude, position.latitude])
        .addTo(map.current);
    }

    // Draw route
    const drawRoute = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mapbox-directions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              startLng: position.longitude,
              startLat: position.latitude,
              endLng: destinationCoords[0],
              endLat: destinationCoords[1],
            }),
          }
        );
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0].geometry;

          if (map.current!.getSource("route")) {
            (map.current!.getSource("route") as mapboxgl.GeoJSONSource).setData({
              type: "Feature",
              properties: {},
              geometry: route,
            });
          } else {
            map.current!.addSource("route", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: route,
              },
            });

            map.current!.addLayer({
              id: "route",
              type: "line",
              source: "route",
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": "#8B5CF6",
                "line-width": 6,
                "line-opacity": 0.9,
              },
            });
          }

          // Update camera to follow rider with 3D perspective
          map.current!.easeTo({
            center: [position.longitude, position.latitude],
            zoom: 17,
            pitch: 60,
            bearing: 0,
            duration: 1000,
          });
        }
      } catch (error) {
        console.error("Erro ao desenhar rota:", error);
      }
    };

    drawRoute();
  }, [position, destinationCoords, isMapReady, riderId, orderId]);

  const completeDelivery = async () => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Entrega concluída!");
      navigate("/entregas");
    } catch (error) {
      console.error("Erro ao concluir entrega:", error);
      toast.error("Erro ao concluir entrega");
    }
  };

  const cancelDelivery = async () => {
    if (!cancellationReason.trim()) {
      toast.error("Por favor, informe o motivo do cancelamento");
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "cancelled",
          cancellation_reason: cancellationReason
        })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Entrega cancelada");
      navigate("/entregas");
    } catch (error) {
      console.error("Erro ao cancelar entrega:", error);
      toast.error("Erro ao cancelar entrega");
    }
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate("/entregas")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="text-center flex-1">
            <h1 className="font-bold text-lg">Navegação em Tempo Real</h1>
            <p className="text-sm text-muted-foreground">{order.customer_name}</p>
          </div>
          <a href={`tel:${order.customer_phone}`}>
            <Button variant="outline" size="sm">
              <Phone className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Info Card */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <Card className="p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <Navigation className="w-5 h-5 text-primary mt-1" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{order.customer_address}</p>
                <p className="text-xs text-muted-foreground">
                  {order.customer_neighborhood}, {order.customer_city} - {order.customer_state}
                </p>
                <p className="text-xs text-muted-foreground">CEP: {order.customer_cep}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-2">
          <Button 
            className="flex-1 h-12"
            onClick={completeDelivery}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Concluir Entrega
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="flex-1 h-12"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancelar Entrega</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Motivo do cancelamento (ex: endereço não encontrado, cliente não atendeu, etc.)"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={4}
                />
                <Button
                  variant="destructive"
                  onClick={cancelDelivery}
                  className="w-full"
                >
                  Confirmar Cancelamento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
