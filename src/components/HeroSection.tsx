import { Clock, MapPin, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useGuestMode } from '@/hooks/useGuestMode';

export const HeroSection: React.FC = () => {
  const { guestData } = useGuestMode();

  return (
    <section className="bg-card border-b">
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-6">
        <div className="flex items-start gap-4">
          {/* Logo Circle */}
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-primary-foreground font-bold text-lg md:text-xl">BG</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground mb-1">
              Butikin Gastrobar
            </h1>
            
            {/* Status Badge */}
            <Badge variant="outline" className="text-xs mb-2 border-success text-success">
              Aberto
            </Badge>

            {/* Quick Info Row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>30-50min</span>
              </div>
              <span className="text-muted-foreground/50">•</span>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>Entrega</span>
              </div>
              {guestData?.name && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{guestData.name}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
