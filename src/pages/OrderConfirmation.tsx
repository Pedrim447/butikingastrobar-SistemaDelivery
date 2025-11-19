import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, MapPin } from "lucide-react";

export default function OrderConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const trackingCode = searchParams.get("tracking");

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
              <p className="text-sm font-medium mb-1">Código de Rastreamento:</p>
              <p className="text-2xl font-bold text-primary">{trackingCode}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Guarde este código para acompanhar seu pedido
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Em breve você receberá uma atualização sobre o status da entrega.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {trackingCode && (
            <Button 
              onClick={() => navigate(`/rastreamento?code=${trackingCode}`)} 
              className="w-full"
              variant="default"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Rastrear Pedido
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