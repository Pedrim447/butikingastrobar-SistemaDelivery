import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SideDish, SideDishVariation } from '@/types/accompaniments';
import { ArrowLeft, Check } from 'lucide-react';

interface VariationSelectorProps {
  selectedItems: Map<string, { item: SideDish; variationId?: string; variationName?: string }>;
  sideDishes: SideDish[];
  onSelectVariation: (sideDishId: string, variationId: string, variationName: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const VariationSelector = ({
  selectedItems,
  sideDishes,
  onSelectVariation,
  onBack,
  onContinue,
}: VariationSelectorProps) => {
  const [variations, setVariations] = useState<Record<string, SideDishVariation[]>>({});
  const [loading, setLoading] = useState(true);

  const itemsWithVariations = Array.from(selectedItems.entries())
    .filter(([_, data]) => data.item.has_variations)
    .map(([id, data]) => ({ id, ...data }));

  useEffect(() => {
    fetchVariations();
  }, []);

  const fetchVariations = async () => {
    const sideDishIds = itemsWithVariations.map(item => item.id);
    if (sideDishIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('side_dish_variations')
        .select('*')
        .in('side_dish_id', sideDishIds)
        .eq('is_available', true)
        .order('display_order');

      if (error) throw error;

      // Group by side_dish_id
      const grouped = (data || []).reduce((acc, v) => {
        if (!acc[v.side_dish_id]) acc[v.side_dish_id] = [];
        acc[v.side_dish_id].push(v);
        return acc;
      }, {} as Record<string, SideDishVariation[]>);

      setVariations(grouped);
    } catch (error) {
      console.error('Error fetching variations:', error);
    } finally {
      setLoading(false);
    }
  };

  const allVariationsSelected = itemsWithVariations.every(
    item => item.variationId || !variations[item.id]?.length
  );

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Carregando...</div>;
  }

  if (itemsWithVariations.length === 0) {
    onContinue();
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <h3 className="font-semibold text-sm">Escolha o tipo de cada item</h3>
      </div>

      {itemsWithVariations.map(({ id, item, variationId }) => {
        const itemVariations = variations[id] || [];
        if (itemVariations.length === 0) return null;

        return (
          <div key={id} className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">{item.name}</h4>
            <div className="grid grid-cols-2 gap-2">
              {itemVariations.map(variation => (
                <button
                  key={variation.id}
                  type="button"
                  onClick={() => onSelectVariation(id, variation.id, variation.name)}
                  className={cn(
                    'border rounded-lg p-3 flex items-center justify-center transition-all relative',
                    variationId === variation.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border hover:border-muted-foreground'
                  )}
                >
                  {variationId === variation.id && (
                    <Check className="w-4 h-4 text-primary absolute top-1 right-1" />
                  )}
                  <span className="text-sm font-medium">{variation.name}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <Button
        className="w-full"
        onClick={onContinue}
        disabled={!allVariationsSelected}
      >
        Continuar
      </Button>
    </div>
  );
};
