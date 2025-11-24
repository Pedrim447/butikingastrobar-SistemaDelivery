import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package, MapPin, Clock, CheckCircle, XCircle, Bike, ArrowLeft } from "lucide-react";
import { OrderTrackingMap } from "@/components/OrderTrackingMap";

interface Order {
  id: string;
  tracking_code: string;
  customer_name: string;
  customer_address: string;
  customer_neighborhood: string;
  customer_city: string;
  customer_state: string;
  status: string;
  total: number;
  created_at: string;
  delivery_rider_id: string | null;
  cancellation_reason: string | null;
  order_items: Array<{
    product_name: string;
    quantity: number;
    product_price: number;
  }>;
}

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [trackingCode, setTrackingCode] = useState(searchParams.get("code") || "");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code") || localStorage.getItem("lastOrderCode");
    if (code) {
      setTrackingCode(code);
      fetchOrder(code);
    }
  }, [searchParams]);

  const fetchOrder = async (code: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("tracking_code", code.toUpperCase())
        .single();

      if (error) throw error;

      if (!data) {
        toast.error("Pedido não encontrado");
        return;
      }

      setOrder(data);
      localStorage.setItem("lastOrderCode", code);
    } catch (error) {
      console.error("Erro ao buscar pedido:", error);
      toast.error("Erro ao buscar pedido");
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = () => {
    if (!trackingCode.trim()) {
      toast.error("Digite o código de rastreamento");
      return;
    }
    navigate(`/rastreamento?code=${trackingCode.toUpperCase()}`);
    fetchOrder(trackingCode);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Pendente", icon: Clock, color: "bg-yellow-500" };
      case "preparing":
        return { label: "Aguardando Entregador", icon: Clock, color: "bg-blue-500" };
      case "out_for_delivery":
        return { label: "Saiu para Entrega", icon: Bike, color: "bg-purple-500" };
      case "delivered":
        return { label: "Entregue", icon: CheckCircle, color: "bg-green-500" };
      case "cancelled":
        return { label: "Cancelado", icon: XCircle, color: "bg-red-500" };
      default:
        return { label: status, icon: Package, color: "bg-gray-500" };
    }
  };

  const statusInfo = order ? getStatusInfo(order.status) : null;
  const StatusIcon = statusInfo?.icon;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-foreground">Rastreamento de Pedido</h1>
            <p className="text-muted-foreground">Acompanhe seu pedido em tempo real</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Digite seu código de rastreamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="tracking-code">Código de Rastreamento</Label>
                <Input
                  id="tracking-code"
                  placeholder="Ex: A1B2C3D4"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === "Enter" && handleTrack()}
                  className="uppercase"
                />
              </div>
              <Button onClick={handleTrack} disabled={loading} className="mt-auto">
                {loading ? "Buscando..." : "Rastrear"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {order && (
          <>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5" />
                      Pedido #{order.tracking_code}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge className={statusInfo?.color}>
                    {StatusIcon && <StatusIcon className="h-3.5 w-3.5 mr-1.5" />}
                    {statusInfo?.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-t pt-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{order.customer_address}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customer_neighborhood}, {order.customer_city} - {order.customer_state}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2 text-sm">Itens do Pedido</h4>
                  <div className="space-y-1.5">
                    {order.order_items.map((item, idx) => (
                      <div key={idx} className="text-sm flex justify-between py-0.5">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>R$ {(item.product_price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t font-medium flex justify-between text-sm">
                    <span>Total</span>
                    <span>R$ {order.total.toFixed(2)}</span>
                  </div>
                </div>

                {order.cancellation_reason && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-destructive">
                      <strong>Motivo do Cancelamento:</strong> {order.cancellation_reason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {order.status === "out_for_delivery" && order.delivery_rider_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bike className="h-5 w-5" />
                    Localização em Tempo Real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrderTrackingMap 
                    orderId={order.id} 
                    deliveryRiderId={order.delivery_rider_id}
                    destinationAddress={`${order.customer_address}, ${order.customer_neighborhood}, ${order.customer_city} - ${order.customer_state}`}
                  />
                </CardContent>
              </Card>
            )}

            {order.status === "preparing" && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-lg font-medium mb-1">Aguardando Entregador</p>
                    <p className="text-sm text-muted-foreground">
                      Seu pedido está pronto e aguardando o entregador iniciar a rota. 
                      A localização em tempo real aparecerá aqui assim que a entrega começar.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}