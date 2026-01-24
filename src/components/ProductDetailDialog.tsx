import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Product, SideDish } from '@/types';
import { ShoppingBag, Minus, Plus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REQUIRED_SIDES_COUNT = 3;

export const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  product,
  open,
  onOpenChange,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSides, setSelectedSides] = useState<string[]>([]);
  const [sideDishes, setSideDishes] = useState<SideDish[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    if (open) {
      fetchSideDishes();
    }
  }, [open]);

  const fetchSideDishes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('side_dishes')
      .select('*')
      .eq('is_available', true)
      .order('display_order');

    if (error) {
      console.error('Erro ao carregar acompanhamentos:', error);
      setSideDishes([]);
    } else {
      setSideDishes(data as SideDish[]);
    }
    setLoading(false);
  };

  if (!product) return null;

  const handleSideToggle = (sideId: string) => {
    setSelectedSides(prev => {
      if (prev.includes(sideId)) {
        return prev.filter(id => id !== sideId);
      } else if (prev.length < REQUIRED_SIDES_COUNT) {
        return [...prev, sideId];
      }
      return prev;
    });
  };

  const calculateTotal = () => {
    const sidesTotal = selectedSides.reduce((total, sideId) => {
      const side = sideDishes.find(s => s.id === sideId);
      return total + (side?.price || 0);
    }, 0);
    return (product.price + sidesTotal) * quantity;
  };

  const canAddToCart = selectedSides.length === REQUIRED_SIDES_COUNT;

  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error(`Selecione exatamente ${REQUIRED_SIDES_COUNT} acompanhamentos!`);
      return;
    }

    const sidesLabels = selectedSides
      .map(id => {
        const side = sideDishes.find(s => s.id === id);
        if (!side) return '';
        return side.price > 0 ? `${side.name} (+R$ ${side.price.toFixed(2)})` : side.name;
      })
      .filter(Boolean);

    const notes = sidesLabels.join(', ');

    addToCart(product, quantity, notes);
    toast.success(`${product.name} adicionado ao carrinho!`);
    onOpenChange(false);
    
    // Reset form
    setQuantity(1);
    setSelectedSides([]);
  };

  const handleClose = () => {
    onOpenChange(false);
    setQuantity(1);
    setSelectedSides([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 left-4 rounded-full"
            onClick={handleClose}
          >
            ×
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Product Info */}
          <div>
            <h2 className="text-xl font-bold mb-1">{product.name}</h2>
            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
            )}
          </div>

          {/* Side Dishes Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Escolha os Acompanhamentos</h3>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                selectedSides.length === REQUIRED_SIDES_COUNT 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {selectedSides.length}/{REQUIRED_SIDES_COUNT} selecionados
              </span>
            </div>
            
            {loading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Carregando acompanhamentos...
              </div>
            ) : sideDishes.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Nenhum acompanhamento disponível
              </div>
            ) : (
              <div className="space-y-1">
                {sideDishes.map(side => {
                  const isSelected = selectedSides.includes(side.id);
                  const isDisabled = !isSelected && selectedSides.length >= REQUIRED_SIDES_COUNT;
                  
                  return (
                    <div
                      key={side.id}
                      className={`flex items-center justify-between py-2 px-2 border rounded-lg transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border'
                      } ${isDisabled ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={side.id}
                          checked={isSelected}
                          disabled={isDisabled}
                          onCheckedChange={() => handleSideToggle(side.id)}
                        />
                        <Label 
                          htmlFor={side.id} 
                          className={`cursor-pointer text-sm ${isDisabled ? 'cursor-not-allowed' : ''}`}
                        >
                          {side.name}
                        </Label>
                      </div>
                      {side.price > 0 && (
                        <span className="text-sm font-medium text-primary">
                          +R$ {side.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {selectedSides.length < REQUIRED_SIDES_COUNT && (
              <p className="text-xs text-amber-600">
                * Obrigatório escolher {REQUIRED_SIDES_COUNT} acompanhamentos
              </p>
            )}
          </div>
        </div>

        {/* Footer with quantity and add button */}
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
              onClick={handleAddToCart} 
              className="flex-1 max-w-[140px]"
              disabled={!canAddToCart}
            >
              <ShoppingBag className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
