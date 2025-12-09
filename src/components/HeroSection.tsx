import { Clock, MapPin, Phone, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGuestMode } from '@/hooks/useGuestMode';

interface HeroSectionProps {
  onOrderNow: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOrderNow }) => {
  const { guestData } = useGuestMode();

  return (
    <section className="relative bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-6 md:py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Guest Greeting - Compact on mobile */}
          {guestData?.name && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary mb-3 md:mb-6 animate-fade-in">
              <User className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-xs md:text-sm font-medium">Olá, {guestData.name}!</span>
            </div>
          )}

          {/* Logo/Brand - Smaller on mobile */}
          <div className="mb-3 md:mb-6">
            <h1 className="text-2xl md:text-6xl font-bold text-primary mb-1 md:mb-3">
              Butikin Gastrobar
            </h1>
            <div className="h-0.5 md:h-1 w-16 md:w-24 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full" />
          </div>

          {/* Description - Hidden on mobile, shown on desktop */}
          <p className="hidden md:block text-lg md:text-xl text-foreground/80 mb-8 max-w-2xl mx-auto">
            Sabor autêntico e qualidade em cada prato. Preparamos suas refeições com ingredientes frescos e muito carinho. 
            Faça seu pedido e receba no conforto da sua casa!
          </p>

          {/* Mobile: Compact info row */}
          <div className="flex md:hidden items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-primary" />
              <span>11h-23h</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary" />
              <span>Entrega rápida</span>
            </div>
          </div>

          {/* Desktop: Info Cards */}
          <div className="hidden md:grid grid-cols-3 gap-4 mb-8">
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

          {/* CTA Button - Smaller on mobile */}
          <Button 
            onClick={onOrderNow}
            size="default"
            className="text-sm md:text-lg px-6 md:px-8 py-2 md:py-6 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <span className="md:hidden">Ver Cardápio</span>
            <span className="hidden md:inline">Ver Cardápio Completo</span>
            <ChevronDown className="w-4 h-4 ml-1 md:hidden" />
          </Button>
        </div>
      </div>
    </section>
  );
};