import { Clock, MapPin, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGuestMode } from '@/hooks/useGuestMode';

interface HeroSectionProps {
  onOrderNow: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOrderNow }) => {
  const { guestData } = useGuestMode();

  return (
    <section className="relative bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Guest Greeting */}
          {guestData?.name && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary mb-6 animate-fade-in">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">Olá, {guestData.name}!</span>
              <span className="text-xs text-primary/60">(convidado)</span>
            </div>
          )}

          {/* Logo/Brand */}
          <div className="mb-6">
            <h1 className="text-4xl md:text-6xl font-bold text-primary mb-3">
              Butikin Gastrobar
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full" />
          </div>

          {/* Description */}
          <p className="text-lg md:text-xl text-foreground/80 mb-8 max-w-2xl mx-auto">
            Sabor autêntico e qualidade em cada prato. Preparamos suas refeições com ingredientes frescos e muito carinho. 
            Faça seu pedido e receba no conforto da sua casa!
          </p>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card p-4 rounded-lg shadow-md border border-border">
              <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold mb-1">Horário</p>
              <p className="text-xs text-muted-foreground">Seg-Dom: 11h às 23h</p>
            </div>
            
            <div className="bg-card p-4 rounded-lg shadow-md border border-border">
              <MapPin className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold mb-1">Entrega Rápida</p>
              <p className="text-xs text-muted-foreground">Todo o bairro em até 40min</p>
            </div>
            
            <div className="bg-card p-4 rounded-lg shadow-md border border-border">
              <Phone className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold mb-1">Contato</p>
              <p className="text-xs text-muted-foreground">(00) 0000-0000</p>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={onOrderNow}
            size="lg"
            className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Ver Cardápio Completo
          </Button>
        </div>
      </div>
    </section>
  );
};