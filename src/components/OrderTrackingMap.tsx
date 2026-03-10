import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderTrackingMapProps {
  orderId: string;
  deliveryRiderId: string;
  destinationAddress: string;
}

export const OrderTrackingMap: React.FC<OrderTrackingMapProps> = ({
  orderId,
  destinationAddress,
}) => {
  const [fullAddress, setFullAddress] = useState<string>("");

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("customer_address, customer_neighborhood, customer_city, customer_state, customer_cep")
          .eq("id", orderId)
          .single();

        if (error) throw error;
        if (!data) return;

        const address = `${data.customer_address}, ${data.customer_neighborhood}, ${data.customer_city} - ${data.customer_state}, ${data.customer_cep}`;
        setFullAddress(address);
      } catch (error) {
        console.error("Erro ao buscar detalhes do pedido:", error);
        setFullAddress(destinationAddress);
      }
    };

    fetchOrderDetails();
  }, [orderId, destinationAddress]);

  const openInGoogleMaps = () => {
    const query = encodeURIComponent(fullAddress || destinationAddress);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <MapPin className="h-8 w-8 text-primary" />
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium">Endereço de entrega</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {fullAddress || destinationAddress}
        </p>
      </div>

      <Button onClick={openInGoogleMaps} className="gap-2">
        <Navigation className="h-4 w-4" />
        Abrir no Google Maps
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  );
};
