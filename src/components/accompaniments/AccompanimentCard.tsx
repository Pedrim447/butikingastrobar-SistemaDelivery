import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SideDish, SideDishVariation } from '@/types/accompaniments';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AccompanimentCardProps {
  item: SideDish;
  isSelected: boolean;
  hasVariation?: boolean;
  selectedVariationName?: string;
  onToggle: () => void;
  onSelectVariation?: (variationId: string, variationName: string) => void;
}

export const AccompanimentCard = ({
  item,
  isSelected,
  hasVariation,
  selectedVariationName,
  onToggle,
  onSelectVariation,
}: AccompanimentCardProps) => {
  const [imgError, setImgError] = useState(false);
  const [showVariations, setShowVariations] = useState(false);
  const [variations, setVariations] = useState<SideDishVariation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);

  useEffect(() => {
    if (hasVariation && showVariations && variations.length === 0) {
      fetchVariations();
    }
  }, [showVariations, hasVariation]);

  const fetchVariations = async () => {
    setLoadingVariations(true);
    try {
      const { data, error } = await supabase
        .from('side_dish_variations')
        .select('*')
        .eq('side_dish_id', item.id)
        .eq('is_available', true)
        .order('display_order');
      if (error) throw error;
      setVariations(data || []);
    } catch (e) {
      console.error('Error fetching variations:', e);
    } finally {
      setLoadingVariations(false);
    }
  };

  const handleClick = () => {
    if (hasVariation && !isSelected) {
      setShowVariations(true);
    } else if (hasVariation && isSelected) {
      // Deselect
      onToggle();
      setShowVariations(false);
    } else {
      onToggle();
    }
  };

  const handleVariationSelect = (v: SideDishVariation) => {
    if (!isSelected) {
      onToggle(); // select the item first
    }
    onSelectVariation?.(v.id, v.name);
    setShowVariations(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'border rounded-lg overflow-hidden flex flex-col transition-all relative w-full',
          isSelected
            ? 'border-primary bg-primary/10 ring-1 ring-primary'
            : 'border-border hover:border-muted-foreground'
        )}
      >
        {isSelected && (
          <div className="absolute top-1 right-1 z-10">
            <Check className="w-4 h-4 text-primary" />
          </div>
        )}
        <div className="w-full h-20 bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {item.image_url && !imgError ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span className="text-xs text-muted-foreground px-1 text-center">{item.name[0]}</span>
          )}
        </div>
        <div className="p-2 flex flex-col items-center">
          <span className="font-medium text-sm text-center leading-tight">{item.name}</span>
          {item.price > 0 && (
            <span className="text-xs text-muted-foreground mt-0.5">
              R$ {item.price.toFixed(2)}
            </span>
          )}
          {hasVariation && selectedVariationName && (
            <span className="text-xs text-primary font-medium mt-1">{selectedVariationName}</span>
          )}
          {hasVariation && !selectedVariationName && (
            <span className="text-xs text-muted-foreground mt-1">Toque para escolher tipo</span>
          )}
        </div>
      </button>

      {/* Inline variation picker */}
      {showVariations && hasVariation && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg p-2 space-y-1">
          {loadingVariations ? (
            <p className="text-xs text-muted-foreground text-center py-2">Carregando...</p>
          ) : (
            variations.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => handleVariationSelect(v)}
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
              >
                {v.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
