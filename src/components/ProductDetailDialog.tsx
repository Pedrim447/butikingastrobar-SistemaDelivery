import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { SideDish } from '@/types/accompaniments';
import { ShoppingBag, Minus, Plus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { useAccompaniments } from '@/hooks/useAccompaniments';
import { AccompanimentCard } from '@/components/accompaniments/AccompanimentCard';
import { VariationSelector } from '@/components/accompaniments/VariationSelector';

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SelectionData = {
  item: SideDish;
  variationId?: string;
  variationName?: string;
};

const MANDATORY_COUNT = 3;

export const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  product,
  open,
  onOpenChange,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<Map<string, SelectionData>>(new Map());
  const [step, setStep] = useState<'select' | 'variations'>('select');
  const { addToCart } = useCart();
  const { sideDishes, loading, refetch } = useAccompaniments();

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  useEffect(() => {
    if (!open) {
      setQuantity(1);
      setSelectedAccompaniments(new Map());
      setStep('select');
    }
  }, [open]);

  if (!product) return null;

  const getItemPrice = (id: string): number => {
    const data = selectedAccompaniments.get(id);
    return data?.item.price || 0;
  };

  const totalAccompaniments = selectedAccompaniments.size;

  const calculateAccompanimentsPrice = (): number => {
    let freeRemaining = MANDATORY_COUNT;
    let totalExtra = 0;

    const sortedItems = Array.from(selectedAccompaniments.entries())
      .sort((a, b) => (a[1].item.price || 0) - (b[1].item.price || 0));

    for (const [_, data] of sortedItems) {
      const price = data.item.price || 0;
      if (freeRemaining > 0) {
        freeRemaining--;
      } else {
        totalExtra += price;
      }
    }

    return totalExtra;
  };

  const calculateTotal = (): number => {
    const accompanimentsPrice = calculateAccompanimentsPrice();
    return (product.price + accompanimentsPrice) * quantity;
  };

  const toggleAccompaniment = (item: SideDish) => {
    setSelectedAccompaniments(prev => {
      const newMap = new Map(prev);
      if (newMap.has(item.id)) {
        newMap.delete(item.id);
      } else {
        newMap.set(item.id, { item });
      }
      return newMap;
    });
  };

  const hasItemsWithVariations = (): boolean => {
    return Array.from(selectedAccompaniments.values()).some(data => data.item.has_variations);
  };

  const handleProceed = () => {
    if (totalAccompaniments < MANDATORY_COUNT) {
      toast.error('Selecione pelo menos 3 acompanhamentos!');
      return;
    }

    if (hasItemsWithVariations()) {
      setStep('variations');
    } else {
      handleAddToCart();
    }
  };

  const handleSelectVariation = (sideDishId: string, variationId: string, variationName: string) => {
    setSelectedAccompaniments(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(sideDishId);
      if (existing) {
        newMap.set(sideDishId, { ...existing, variationId, variationName });
      }
      return newMap;
    });
  };

  const canAddToCart = totalAccompaniments >= MANDATORY_COUNT;

  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error('Selecione pelo menos 3 acompanhamentos!');
      return;
    }

    const selectedItems = Array.from(selectedAccompaniments.values())
      .map(data => {
        if (data.variationName) {
          return `${data.item.name} (${data.variationName})`;
        }
        return data.item.name;
      })
      .filter(Boolean);

    const extraCost = calculateAccompanimentsPrice();
    let notes = `Acompanhamentos: ${selectedItems.join(', ')}`;
    if (extraCost > 0) {
      notes += ` | Adicionais: +R$ ${extraCost.toFixed(2)}`;
    }

    addToCart(product, quantity, notes);
    toast.success(`${product.name} adicionado ao carrinho!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        {/* Product Image */}
        <div className="relative w-full h-48 bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground">Sem imagem</span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Product Info */}
          <div>
            <h2 className="text-xl font-bold mb-1">{product.name}</h2>
            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
            )}
          </div>

          {step === 'select' ? (
            <>
              {/* Accompaniments Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Escolha os Acompanhamentos</h3>
                  <span className={`text-sm font-medium ${totalAccompaniments >= MANDATORY_COUNT ? 'text-green-600' : 'text-destructive'}`}>
                    {totalAccompaniments}/{MANDATORY_COUNT} obrigatórios
                  </span>
                </div>

                {loading ? (
                  <div className="text-center py-4 text-muted-foreground">Carregando...</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {sideDishes.map(item => {
                      const selectionData = selectedAccompaniments.get(item.id);
                      const isSelected = !!selectionData;
                      return (
                        <AccompanimentCard
                          key={item.id}
                          item={item}
                          isSelected={isSelected}
                          hasVariation={item.has_variations}
                          selectedVariationName={selectionData?.variationName}
                          onToggle={() => toggleAccompaniment(item)}
                        />
                      );
                    })}
                  </div>
                )}

                <p className="text-xs text-destructive">
                  * Obrigatório escolher 3 acompanhamentos (grátis)
                </p>
              </div>
            </>
          ) : (
            <VariationSelector
              selectedItems={selectedAccompaniments}
              sideDishes={sideDishes}
              onSelectVariation={handleSelectVariation}
              onBack={() => setStep('select')}
              onContinue={handleAddToCart}
            />
          )}
        </div>

        {/* Footer with quantity and add button */}
        {step === 'select' && (
          <div className="sticky bottom-0 bg-card border-t p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-bold">
                R$ {calculateTotal().toFixed(2)}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="font-bold w-6 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={handleProceed}
                className="flex-1 max-w-[140px]"
                disabled={!canAddToCart}
              >
                <ShoppingBag className="w-4 h-4 mr-1" />
                {hasItemsWithVariations() ? 'Continuar' : 'Adicionar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
