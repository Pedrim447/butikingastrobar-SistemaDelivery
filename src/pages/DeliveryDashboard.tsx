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
import { Package, Phone, MapPin, ArrowLeft, Navigation, CreditCard, Banknote, QrCode, CheckCircle2 } from "lucide-react";

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
  payment_method: string | null;
  payment_status: string | null;
  order_items: Array<{
    product_name: string;
    quantity: number;
    product_price: number;
  }>;
}

const PAYMENT_INFO: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  pix:           { label: 'PIX',          icon: <QrCode className="w-6 h-6" />,    bg: 'bg-green-500',  text: 'text-white' },
  dinheiro:      { label: 'Dinheiro',     icon: <Banknote className="w-6 h-6" />,  bg: 'bg-yellow-400', text: 'text-yellow-900' },
  cartao_debito: { label: 'Cartão Débito',icon: <CreditCard className="w-6 h-6" />,bg: 'bg-blue-500',   text: 'text-white' },
  cartao_credito:{ label: 'Cartão Crédito',icon:<CreditCard className="w-6 h-6" />,bg: 'bg-purple-600', text: 'text-white' },
};

export default function DeliveryDashboard() {
  const { user, isDeliveryRider, signOut, loading: authLoading, checkingRole } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || checkingRole) return;

    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    
    if (!isDeliveryRider) {
      navigate("/", { replace: true });
      return;
    }

    fetchMyOrders();
  }, [user, isDeliveryRider, navigate, authLoading, checkingRole]);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("delivery_rider_id", user?.id)
        .in("status", ["preparing", "out_for_delivery"])
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

  const startDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "out_for_delivery" })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Rota iniciada!");
      navigate(`/entregas/navegacao/${orderId}`);
    } catch (error) {
      console.error("Erro ao iniciar rota:", error);
      toast.error("Erro ao iniciar rota");
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minhas Entregas</h1>
            <p className="text-muted-foreground">Pedidos atribuídos a você</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sair
            </Button>
          </div>
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
          <div className="grid gap-4">
            {orders.map((order) => {
              const pm = PAYMENT_INFO[order.payment_method || ''];
              const pixPaid = order.payment_method === 'pix' && order.payment_status === 'approved';

              return (
                <Card key={order.id} className="shadow-md overflow-hidden">
                  {/* Payment Banner - large and prominent */}
                  <div className={`w-full flex items-center justify-between px-4 py-3 ${pm?.bg ?? 'bg-muted'} ${pm?.text ?? 'text-foreground'}`}>
                    <div className="flex items-center gap-3">
                      {pm?.icon ?? <CreditCard className="w-6 h-6" />}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Forma de Pagamento</p>
                        <p className="text-2xl font-black leading-tight">{pm?.label ?? (order.payment_method || 'Não informado')}</p>
                      </div>
                    </div>
                    {pixPaid && (
                      <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-bold">PAGO</span>
                      </div>
                    )}
                    {order.payment_method === 'pix' && !pixPaid && (
                      <div className="flex items-center gap-1.5 bg-black/20 rounded-full px-3 py-1.5">
                        <span className="text-sm font-bold">Aguardando</span>
                      </div>
                    )}
                  </div>

                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Package className="h-4 w-4" />
                        Pedido #{order.id.substring(0, 8).toUpperCase()}
                      </CardTitle>
                      <Badge 
                        variant={order.status === "out_for_delivery" ? "default" : "secondary"} 
                        className="text-xs"
                      >
                        {order.status === "out_for_delivery" ? "Em Rota" : "Pronto p/ Entrega"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("pt-BR")}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3 px-4 pb-4">
                    <div className="border-t pt-3">
                      <div className="flex items-start gap-2 mb-2">
                        <Phone className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold text-sm">{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 mt-2">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                        <div className="text-xs">
                          <p className="font-medium">{order.customer_address}</p>
                          <p className="text-muted-foreground">
                            {order.customer_neighborhood}, {order.customer_city} - {order.customer_state}
                          </p>
                          <p className="text-muted-foreground">CEP: {order.customer_cep}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <h4 className="font-semibold mb-1.5 text-sm">Itens do Pedido</h4>
                      {order.order_items.map((item, idx) => (
                        <div key={idx} className="text-xs flex justify-between py-0.5">
                          <span>{item.quantity}x {item.product_name}</span>
                          <span>R$ {item.product_price.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="mt-1.5 pt-1.5 border-t font-bold flex justify-between text-base">
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

                    <div className="flex gap-2 pt-3 border-t">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive/10"
                            onClick={() => setSelectedOrderId(order.id)}
                          >
                            Cancelar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Cancelar Entrega</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">Informe o motivo do cancelamento:</p>
                            <Textarea
                              value={cancellationReason}
                              onChange={(e) => setCancellationReason(e.target.value)}
                              placeholder="Ex: Cliente não atendeu, endereço não encontrado..."
                            />
                            <Button className="w-full" variant="destructive" onClick={cancelDelivery}>
                              Confirmar Cancelamento
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {order.status === "preparing" ? (
                        <Button 
                          size="sm"
                          className="flex-1"
                          onClick={() => startDelivery(order.id)}
                        >
                          <Navigation className="h-3.5 w-3.5 mr-1.5" />
                          Iniciar Rota
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/entregas/navegacao/${order.id}`)}
                        >
                          <Navigation className="h-3.5 w-3.5 mr-1.5" />
                          Continuar Navegação
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
