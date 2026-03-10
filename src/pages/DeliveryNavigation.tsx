import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Navigation, CheckCircle, XCircle, Phone, MapPin, ExternalLink } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user, loading: authLoading, checkingRole } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [riderId, setRiderId] = useState<string | null>(null);
  const { position } = useGeolocation(true);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (!authLoading && !checkingRole) {
      setIsAuthReady(true);
    }
  }, [authLoading, checkingRole]);

  useEffect(() => {
    if (isAuthReady && !user) {
      navigate("/auth");
    }
  }, [isAuthReady, user, navigate]);

  // Fetch order details
  useEffect(() => {
    if (!isAuthReady || !user || !orderId) return;

    let mounted = true;

    const fetchOrder = async () => {
      try {
        setRiderId(user.id);

        const { data: orderData, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .eq("delivery_rider_id", user.id)
          .single();

        if (!mounted) return;

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

    setOrder(null);
    setRiderId(null);
    fetchOrder();

    return () => { mounted = false; };
  }, [orderId, navigate, isAuthReady, user]);

  // Update rider location in database
  useEffect(() => {
    if (!position || !riderId || !orderId) return;

    const updateLocation = async () => {
      try {
        const { data: existingData } = await supabase
          .from("delivery_rider_locations")
          .select("id")
          .eq("delivery_rider_id", riderId)
          .eq("order_id", orderId)
          .maybeSingle();

        if (existingData) {
          await supabase
            .from("delivery_rider_locations")
            .update({
              latitude: position.latitude,
              longitude: position.longitude,
              updated_at: new Date().toISOString(),
            })
            .eq("delivery_rider_id", riderId)
            .eq("order_id", orderId);
        } else {
          await supabase
            .from("delivery_rider_locations")
            .insert({
              delivery_rider_id: riderId,
              order_id: orderId,
              latitude: position.latitude,
              longitude: position.longitude,
            });
        }
      } catch (error) {
        console.error("Erro ao atualizar localização:", error);
      }
    };

    updateLocation();
  }, [position, riderId, orderId]);

  const openInGoogleMaps = () => {
    if (!order) return;
    const address = `${order.customer_address}, ${order.customer_neighborhood}, ${order.customer_city} - ${order.customer_state}`;
    const query = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, "_blank");
  };

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
          cancellation_reason: cancellationReason,
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

  if (authLoading || checkingRole || !isAuthReady || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg">Carregando navegação...</div>
        </div>
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
            <h1 className="font-bold text-lg">Navegação</h1>
            <p className="text-sm text-muted-foreground">{order.customer_name}</p>
          </div>
          <a href={`tel:${order.customer_phone}`}>
            <Button variant="outline" size="sm">
              <Phone className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        {/* Address Card */}
        <Card className="w-full max-w-md p-6 space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-1 shrink-0" />
            <div>
              <p className="font-medium">{order.customer_address}</p>
              <p className="text-sm text-muted-foreground">
                {order.customer_neighborhood}, {order.customer_city} - {order.customer_state}
              </p>
              <p className="text-sm text-muted-foreground">CEP: {order.customer_cep}</p>
            </div>
          </div>

          <Button onClick={openInGoogleMaps} className="w-full gap-2" size="lg">
            <Navigation className="h-5 w-5" />
            Navegar com Google Maps
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Card>

        {/* Status indicator */}
        {position && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Sua localização está sendo compartilhada</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full max-w-md flex gap-2">
          <Button className="flex-1 h-12" onClick={completeDelivery}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Concluir Entrega
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="flex-1 h-12">
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
                <Button variant="destructive" onClick={cancelDelivery} className="w-full">
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
