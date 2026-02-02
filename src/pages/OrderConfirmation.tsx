import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseWithGuestToken } from "@/lib/supabaseWithGuest";
import { safeStorage } from "@/lib/safeStorage";

const WHATSAPP_NUMBER = "5598987271187";

interface OrderDetails {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNeighborhood: string;
  customerCity: string;
  total: number;
  paymentMethod: string;
  items: Array<{
    productName: string;
    quantity: number;
    subtotal: number;
    notes: string | null;
  }>;
}

export default function OrderConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const trackingCode = searchParams.get("tracking");
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!trackingCode) return;

      // Usar cliente com guest token para passar RLS
      const supabaseClient = getSupabaseWithGuestToken();

      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("tracking_code", trackingCode)
        .single();

      if (orderError || !order) {
        console.error("Error fetching order:", orderError);
        return;
      }

      const { data: items, error: itemsError } = await supabaseClient
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      if (itemsError) {
        console.error("Error fetching order items:", itemsError);
        return;
      }

      setOrderDetails({
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerAddress: order.customer_address,
        customerNeighborhood: order.customer_neighborhood || "",
        customerCity: order.customer_city || "",
        total: order.total,
        paymentMethod: order.payment_method || "dinheiro",
        items: items.map((item) => ({
          productName: item.product_name,
          quantity: item.quantity,
          subtotal: item.subtotal,
          notes: item.notes,
        })),
      });
    };

    fetchOrderDetails();
  }, [trackingCode]);

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      pix: "PIX",
      dinheiro: "Dinheiro",
      cartao_debito: "Cartão de Débito",
      cartao_credito: "Cartão de Crédito",
    };
    return methods[method] || method;
  };

  const generateWhatsAppMessage = () => {
    if (!orderDetails) return "";

    const itemsList = orderDetails.items
      .map((item) => {
        let itemText = `• ${item.quantity}x ${item.productName} - R$ ${item.subtotal.toFixed(2)}`;
        if (item.notes) {
          itemText += `\n   _Obs: ${item.notes}_`;
        }
        return itemText;
      })
      .join("\n");

    const message = `🍽️ *NOVO PEDIDO - ${trackingCode}*

👤 *Cliente:* ${orderDetails.customerName}
📞 *Telefone:* ${orderDetails.customerPhone}

📍 *Endereço de Entrega:*
${orderDetails.customerAddress}
${orderDetails.customerNeighborhood}${orderDetails.customerCity ? ` - ${orderDetails.customerCity}` : ""}

📝 *Itens do Pedido:*
${itemsList}

💰 *Total:* R$ ${orderDetails.total.toFixed(2)}
💳 *Forma de Pagamento:* ${formatPaymentMethod(orderDetails.paymentMethod)}

_Pedido realizado via app_`;

    return encodeURIComponent(message);
  };

  const handleWhatsAppClick = () => {
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Pedido Confirmado!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Seu pedido foi recebido e está sendo preparado.
          </p>
          {trackingCode && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-1">Código do Pedido:</p>
              <p className="text-2xl font-bold text-primary">{trackingCode}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Acompanhe seu pedido pelo WhatsApp para receber atualizações.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {orderDetails && (
            <Button 
              onClick={handleWhatsAppClick} 
              className="w-full bg-green-600 hover:bg-green-700"
              variant="default"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Acompanhar pelo WhatsApp
            </Button>
          )}
          <Button onClick={() => navigate("/")} variant="outline" className="w-full">
            Voltar ao Menu
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
