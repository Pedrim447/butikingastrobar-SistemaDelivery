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

// Combined type for accompaniments (can come from side_dishes table or products table)
interface Accompaniment {
  id: string;
  name: string;
  price: number;
  source: 'side_dish' | 'product';
}

const FREE_SIDES_COUNT = 3; // First 3 sides are free (mandatory)

export const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  product,
  open,
  onOpenChange,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSides, setSelectedSides] = useState<string[]>([]);
  const [accompaniments, setAccompaniments] = useState<Accompaniment[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    if (open) {
      fetchAccompaniments();
    }
  }, [open]);

  const fetchAccompaniments = async () => {
    setLoading(true);
    
    // Fetch both side_dishes and products marked as accompaniments in parallel
    const [sideDishesResult, productsResult] = await Promise.all([
      supabase
        .from('side_dishes')
        .select('*')
        .eq('is_available', true)
        .order('display_order'),
      supabase
        .from('products')
        .select('*')
        .eq('is_available', true)
        .eq('show_as_side_dish', true)
        .order('name')
    ]);

    const accompanimentsList: Accompaniment[] = [];

    // Add side dishes
    if (!sideDishesResult.error && sideDishesResult.data) {
      sideDishesResult.data.forEach((sd: SideDish) => {
        accompanimentsList.push({
          id: `side_${sd.id}`,
          name: sd.name,
          price: sd.price,
          source: 'side_dish'
        });
      });
    }

    // Add products marked as accompaniments (excluding the current product being viewed)
    if (!productsResult.error && productsResult.data) {
      productsResult.data.forEach((p: Product) => {
        // Don't show the current product as an accompaniment option
        if (product && p.id !== product.id) {
          accompanimentsList.push({
            id: `prod_${p.id}`,
            name: p.name,
            price: p.price,
            source: 'product'
          });
        }
      });
    }

    setAccompaniments(accompanimentsList);
    setLoading(false);
  };

  if (!product) return null;

  const handleSideToggle = (sideId: string) => {
    setSelectedSides(prev => {
      if (prev.includes(sideId)) {
        return prev.filter(id => id !== sideId);
      } else {
        return [...prev, sideId];
      }
    });
  };

  // Calculate extras cost - first FREE_SIDES_COUNT are free, rest are paid
  const calculateExtrasTotal = () => {
    if (selectedSides.length <= FREE_SIDES_COUNT) {
      return 0;
    }
    
    // Get the prices of sides beyond the free ones
    const extraSides = selectedSides.slice(FREE_SIDES_COUNT);
    return extraSides.reduce((total, sideId) => {
      const side = accompaniments.find(s => s.id === sideId);
      return total + (side?.price || 0);
    }, 0);
  };

  const calculateTotal = () => {
    return (product.price + calculateExtrasTotal()) * quantity;
  };

  const canAddToCart = selectedSides.length >= FREE_SIDES_COUNT;

  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error(`Selecione pelo menos ${FREE_SIDES_COUNT} acompanhamentos obrigatórios!`);
      return;
    }

    // Build notes with selected sides
    const freeSides = selectedSides.slice(0, FREE_SIDES_COUNT);
    const extraSides = selectedSides.slice(FREE_SIDES_COUNT);

    const freeSidesLabels = freeSides.map(id => {
      const side = accompaniments.find(s => s.id === id);
      return side?.name || '';
    }).filter(Boolean);

    const extraSidesLabels = extraSides.map(id => {
      const side = accompaniments.find(s => s.id === id);
      if (!side) return '';
      return `${side.name} (+R$ ${side.price.toFixed(2)})`;
    }).filter(Boolean);

    let notes = `Acompanhamentos: ${freeSidesLabels.join(', ')}`;
    if (extraSidesLabels.length > 0) {
      notes += ` | Extras: ${extraSidesLabels.join(', ')}`;
    }

    // Adjust product price to include extras
    const adjustedProduct = {
      ...product,
      price: product.price + calculateExtrasTotal()
    };

    addToCart(adjustedProduct, quantity, notes);
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

  const freeCount = Math.min(selectedSides.length, FREE_SIDES_COUNT);
  const extraCount = Math.max(0, selectedSides.length - FREE_SIDES_COUNT);

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
              <div className="flex gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  freeCount >= FREE_SIDES_COUNT 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {freeCount}/{FREE_SIDES_COUNT} obrigatórios
                </span>
                {extraCount > 0 && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                    +{extraCount} extras
                  </span>
                )}
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Carregando acompanhamentos...
              </div>
            ) : accompaniments.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Nenhum acompanhamento disponível
              </div>
            ) : (
              <div className="space-y-1">
                {accompaniments.map((side) => {
                  const isSelected = selectedSides.includes(side.id);
                  const selectionIndex = selectedSides.indexOf(side.id);
                  const isPaid = selectionIndex >= FREE_SIDES_COUNT;
                  
                  return (
                    <div
                      key={side.id}
                      className={`flex items-center justify-between py-2 px-2 border rounded-lg transition-colors ${
                        isSelected 
                          ? isPaid 
                            ? 'border-secondary bg-secondary/10' 
                            : 'border-primary bg-primary/5' 
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={side.id}
                          checked={isSelected}
                          onCheckedChange={() => handleSideToggle(side.id)}
                        />
                        <Label 
                          htmlFor={side.id} 
                          className="cursor-pointer text-sm"
                        >
                          {side.name}
                        </Label>
                        {isPaid && (
                          <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                            Extra
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {side.price > 0 ? (
                          isPaid ? (
                            <span className="text-sm font-medium text-primary">
                              +R$ {side.price.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground line-through">
                              R$ {side.price.toFixed(2)}
                            </span>
                          )
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="text-xs space-y-1">
              {selectedSides.length < FREE_SIDES_COUNT && (
                <p className="text-destructive">
                  * Obrigatório escolher {FREE_SIDES_COUNT} acompanhamentos (grátis)
                </p>
              )}
              {selectedSides.length >= FREE_SIDES_COUNT && (
                <p className="text-primary">
                  ✓ {FREE_SIDES_COUNT} acompanhamentos inclusos. Adicione mais por um valor extra!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer with quantity and add button */}
        <div className="sticky bottom-0 bg-card border-t p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-lg font-bold">
                R$ {calculateTotal().toFixed(2)}
              </span>
              {extraCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  (inclui R$ {calculateExtrasTotal().toFixed(2)} de extras)
                </span>
              )}
            </div>
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