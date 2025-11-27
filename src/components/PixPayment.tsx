import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Copy, X, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PixPaymentProps {
  orderId: string;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt: string;
  paymentId: string;
  onPaymentConfirmed: () => void;
  onCancel: () => void;
}

export default function PixPayment({
  orderId,
  qrCode,
  qrCodeBase64,
  expiresAt,
  paymentId,
  onPaymentConfirmed,
  onCancel,
}: PixPaymentProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [progress, setProgress] = useState(100);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const expiryTime = new Date(expiresAt).getTime();
    const totalTime = expiryTime - Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = expiryTime - now;

      if (remaining <= 0) {
        clearInterval(interval);
        setTimeRemaining(0);
        setProgress(0);
        toast.error("Tempo expirado! Por favor, refaça o pedido.");
      } else {
        setTimeRemaining(remaining);
        setProgress((remaining / totalTime) * 100);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    // Verificar status do pagamento a cada 5 segundos
    const checkInterval = setInterval(async () => {
      setChecking(true);
      try {
        const { data, error } = await supabase.functions.invoke('check-payment-status', {
          body: { paymentId },
        });

        if (error) throw error;

        if (data.paymentStatus === 'paid') {
          clearInterval(checkInterval);
          toast.success("Pagamento confirmado!");
          onPaymentConfirmed();
        } else if (data.paymentStatus === 'failed') {
          clearInterval(checkInterval);
          toast.error("Pagamento falhou!");
        }
      } catch (error) {
        console.error('Error checking payment:', error);
      } finally {
        setChecking(false);
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [paymentId, onPaymentConfirmed]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrCode);
    toast.success("Código PIX copiado!");
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pagamento PIX</span>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg flex items-center justify-center">
            <img
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="QR Code PIX"
              className="w-64 h-64"
            />
          </div>

          {/* Timer */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tempo restante:</span>
              <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Status */}
          {checking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verificando pagamento...</span>
            </div>
          )}

          {/* Copiar código */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Copie o código abaixo ou escaneie o QR Code:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={qrCode}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-muted rounded-md font-mono"
              />
              <Button onClick={copyToClipboard} size="icon">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Abra o app do seu banco e escolha pagar com PIX
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Escaneie o QR Code ou cole o código copiado
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Confirme o pagamento e aguarde a confirmação
              </p>
            </div>
          </div>

          {/* Botão Cancelar */}
          <Button
            variant="outline"
            className="w-full"
            onClick={onCancel}
          >
            Cancelar Pedido
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}