import { cn } from '@/lib/utils';
import { SideDish } from '@/types/accompaniments';
import { ChevronRight, Check } from 'lucide-react';

interface AccompanimentCardProps {
  item: SideDish;
  isSelected: boolean;
  hasVariation?: boolean;
  selectedVariationName?: string;
  onToggle: () => void;
}

export const AccompanimentCard = ({
  item,
  isSelected,
  hasVariation,
  selectedVariationName,
  onToggle,
}: AccompanimentCardProps) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'border rounded-lg p-3 flex flex-col items-center justify-center min-h-[70px] transition-all relative',
        isSelected
          ? 'border-primary bg-primary/10 ring-1 ring-primary'
          : 'border-border hover:border-muted-foreground'
      )}
    >
      {isSelected && (
        <div className="absolute top-1 right-1">
          <Check className="w-4 h-4 text-primary" />
        </div>
      )}
      <span className="font-medium text-sm text-center">{item.name}</span>
      {item.price > 0 && (
        <span className="text-xs text-muted-foreground mt-1">
          R$ {item.price.toFixed(2)}
        </span>
      )}
      {hasVariation && (
        <div className="flex items-center gap-1 mt-1">
          {selectedVariationName ? (
            <span className="text-xs text-primary font-medium">{selectedVariationName}</span>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">Escolher tipo</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </>
          )}
        </div>
      )}
    </button>
  );
};
