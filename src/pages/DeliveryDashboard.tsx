import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Package, Phone, MapPin, CheckCircle, XCircle } from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_cep: string;
  customer_city: string;
  customer_neighborhood: string;
  customer_state: string;
  total: number;
  delivery_fee: number;
  status: string;
  created_at: string;
  notes: string;
  order_items: Array<{
    product_name: string;
    quantity: number;
    product_price: number;
  }>;
}

export default function DeliveryDashboard() {
  const { user, isDeliveryRider, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!isDeliveryRider) {
      navigate("/");
      return;
    }

    fetchMyOrders();
  }, [user, isDeliveryRider, navigate]);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      
      // First get the delivery rider id
      const { data: riderData, error: riderError } = await supabase
        .from("delivery_riders")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (riderError) throw riderError;

      // Then fetch orders assigned to this rider
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("delivery_rider_id", riderData.id)
        .in("status", ["out_for_delivery"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(ordersData || []);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const completeDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Entrega concluída!");
      fetchMyOrders();
    } catch (error) {
      console.error("Erro ao concluir entrega:", error);
      toast.error("Erro ao concluir entrega");
    }
  };

  const cancelDelivery = async () => {
    if (!selectedOrderId || !cancellationReason.trim()) {
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
        .eq("id", selectedOrderId);

      if (error) throw error;

      toast.success("Entrega cancelada");
      setCancellationReason("");
      setSelectedOrderId(null);
      fetchMyOrders();
    } catch (error) {
      console.error("Erro ao cancelar entrega:", error);
      toast.error("Erro ao cancelar entrega");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minhas Entregas</h1>
            <p className="text-muted-foreground">Pedidos atribuídos a você</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sair
          </Button>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Nenhuma entrega atribuída no momento
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => (
              <Card key={order.id} className="shadow-sm">
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="h-4 w-4" />
                        Pedido #{order.id.substring(0, 8)}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(order.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant="default" className="text-xs">Saiu para Entrega</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  <div className="border-t pt-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Phone className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2 mt-2">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                      <div className="text-xs">
                        <p>{order.customer_address}</p>
                        <p className="text-muted-foreground">
                          {order.customer_neighborhood}, {order.customer_city} - {order.customer_state}
                        </p>
                        <p className="text-muted-foreground">CEP: {order.customer_cep}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <h4 className="font-medium mb-1.5 text-sm">Itens do Pedido</h4>
                    {order.order_items.map((item, idx) => (
                      <div key={idx} className="text-xs flex justify-between py-0.5">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>R$ {item.product_price.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="mt-1.5 pt-1.5 border-t font-medium flex justify-between text-sm">
                      <span>Total</span>
                      <span>R$ {order.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground">
                        <strong>Observações:</strong> {order.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-3">
                    <Button 
                      size="sm"
                      className="flex-1"
                      onClick={() => completeDelivery(order.id)}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      Concluir Entrega
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm"
                          variant="destructive" 
                          className="flex-1"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
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
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              onClick={cancelDelivery}
                              className="flex-1"
                            >
                              Confirmar Cancelamento
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
