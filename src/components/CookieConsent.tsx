import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Cookie, X } from 'lucide-react';
import { safeStorage } from '@/lib/safeStorage';

const COOKIE_CONSENT_KEY = 'cookie_consent_accepted';

export const CookieConsent = () => {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const hasConsent = safeStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsent) {
      setShowConsent(true);
    }
  }, []);

  const handleAccept = () => {
    safeStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setShowConsent(false);
  };

  const handleDecline = () => {
    safeStorage.setItem(COOKIE_CONSENT_KEY, 'false');
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in">
      <Card className="max-w-4xl mx-auto shadow-2xl border-2">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Cookie className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">🍪 Cookies e Dados Locais</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Para melhorar sua experiência e permitir que você faça pedidos como <strong>convidado</strong> sem criar conta, 
                salvamos seus dados (nome, telefone, endereço) no navegador de forma segura. 
                Assim, você não precisa digitar tudo novamente nas próximas compras!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <Button onClick={handleAccept} size="lg" className="h-12 px-8 text-base font-semibold flex-1 sm:flex-initial">
                  ✅ Aceitar e Continuar
                </Button>
                <Button onClick={handleDecline} variant="outline" size="lg" className="h-12 px-6 text-base flex-1 sm:flex-initial">
                  Recusar
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDecline}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
