import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Order, OrderItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Home, Loader2 } from "lucide-react";

const OrderConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
      ]);

      if (orderRes.data) setOrder(orderRes.data as Order);
      if (itemsRes.data) setOrderItems(itemsRes.data as OrderItem[]);
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Pedido não encontrado</p>
            <Button onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-4">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Pedido Confirmado!</h1>
          <p className="text-muted-foreground">Seu pedido foi recebido e está sendo preparado</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Pedido #{order.id.slice(0, 8)}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(order.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <Badge variant="secondary" className="text-base">
                {order.status === "pending" ? "Pendente" : order.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Dados de Entrega</h3>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Nome:</strong> {order.customer_name}
                </p>
                <p>
                  <strong>Telefone:</strong> {order.customer_phone}
                </p>
                <p>
                  <strong>Endereço:</strong> {order.customer_address}
                </p>
                <p>
                  <strong>Bairro:</strong> {order.customer_neighborhood}
                </p>
                <p>
                  <strong>Cidade:</strong> {order.customer_city} - {order.customer_state}
                </p>
                <p>
                  <strong>CEP:</strong> {order.customer_cep}
                </p>
              </div>
            </div>

            {order.notes && (
              <div>
                <h3 className="font-semibold mb-1">Observações</h3>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Itens do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderItems.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity}x R$ {item.product_price.toFixed(2)}
                  </p>
                  {item.notes && <p className="text-xs text-muted-foreground mt-1">Obs: {item.notes}</p>}
                </div>
                <p className="font-semibold">R$ {item.subtotal.toFixed(2)}</p>
              </div>
            ))}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>R$ {order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Taxa de entrega</span>
                <span>R$ {order.delivery_fee.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">R$ {order.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button onClick={() => navigate("/")} size="lg" className="w-full">
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Cardápio
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Você receberá atualizações sobre seu pedido via WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
