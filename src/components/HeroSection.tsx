import { Clock, MapPin, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useGuestMode } from '@/hooks/useGuestMode';
import butikinLogo from '@/assets/butikin-logo.jpeg';

export const HeroSection: React.FC = () => {
  const { guestData } = useGuestMode();

  return (
    <section className="bg-card border-b">
      <div className="px-4 md:px-6 py-5 md:py-8">
        <div className="flex items-start gap-5">
          {/* Logo Circle */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 shadow-lg">
            <img src={butikinLogo} alt="ButiKin Logo" className="w-full h-full object-cover" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              Butikin Gastrobar
            </h1>
            
            {/* Status Badge */}
            <Badge variant="outline" className="text-sm mb-2 border-success text-success">
              Aberto
            </Badge>

            {/* Quick Info Row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>30-50min</span>
              </div>
              <span className="text-muted-foreground/50">•</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>Entrega</span>
              </div>
              {guestData?.name && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
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
