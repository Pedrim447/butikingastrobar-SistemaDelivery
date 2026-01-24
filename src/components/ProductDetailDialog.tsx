import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

// Track quantity per accompaniment
interface SelectedAccompaniment {
  id: string;
  quantity: number;
}

const FREE_SIDES_COUNT = 3; // First 3 sides are free (mandatory)

export const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  product,
  open,
  onOpenChange,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<SelectedAccompaniment[]>([]);
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

  const getSelectedItem = (id: string) => selectedAccompaniments.find(s => s.id === id);
  
  const getTotalSelectedCount = () => selectedAccompaniments.reduce((sum, s) => sum + s.quantity, 0);

  const handleToggle = (sideId: string) => {
    setSelectedAccompaniments(prev => {
      const existing = prev.find(s => s.id === sideId);
      if (existing) {
        // Remove if clicking again and quantity is 1
        return prev.filter(s => s.id !== sideId);
      } else {
        // Add with quantity 1
        return [...prev, { id: sideId, quantity: 1 }];
      }
    });
  };

  const handleQuantityChange = (sideId: string, delta: number) => {
    setSelectedAccompaniments(prev => {
      const existing = prev.find(s => s.id === sideId);
      if (!existing) {
        if (delta > 0) {
          return [...prev, { id: sideId, quantity: 1 }];
        }
        return prev;
      }
      
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(s => s.id !== sideId);
      }
      
      return prev.map(s => s.id === sideId ? { ...s, quantity: newQty } : s);
    });
  };

  // Calculate extras cost - first FREE_SIDES_COUNT items are free, rest are paid
  const calculateExtrasTotal = () => {
    const totalCount = getTotalSelectedCount();
    if (totalCount <= FREE_SIDES_COUNT) {
      return 0;
    }
    
    // Calculate paid extras
    let freeRemaining = FREE_SIDES_COUNT;
    let extrasCost = 0;
    
    for (const selected of selectedAccompaniments) {
      const side = accompaniments.find(s => s.id === selected.id);
      if (!side) continue;
      
      const freeToUse = Math.min(freeRemaining, selected.quantity);
      const paidQty = selected.quantity - freeToUse;
      freeRemaining -= freeToUse;
      
      extrasCost += paidQty * side.price;
    }
    
    return extrasCost;
  };

  const calculateTotal = () => {
    return (product.price + calculateExtrasTotal()) * quantity;
  };

  const totalSelectedCount = getTotalSelectedCount();
  const canAddToCart = totalSelectedCount >= FREE_SIDES_COUNT;
  const freeCount = Math.min(totalSelectedCount, FREE_SIDES_COUNT);
  const extraCount = Math.max(0, totalSelectedCount - FREE_SIDES_COUNT);

  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error(`Selecione pelo menos ${FREE_SIDES_COUNT} acompanhamentos obrigatórios!`);
      return;
    }

    // Build notes with selected accompaniments
    const sidesDetails: string[] = [];
    let freeRemaining = FREE_SIDES_COUNT;
    
    for (const selected of selectedAccompaniments) {
      const side = accompaniments.find(s => s.id === selected.id);
      if (!side) continue;
      
      const freeToUse = Math.min(freeRemaining, selected.quantity);
      const paidQty = selected.quantity - freeToUse;
      freeRemaining -= freeToUse;
      
      if (freeToUse > 0) {
        sidesDetails.push(`${side.name} x${freeToUse}`);
      }
      if (paidQty > 0) {
        sidesDetails.push(`${side.name} x${paidQty} (+R$ ${(paidQty * side.price).toFixed(2)})`);
      }
    }

    const notes = `Acompanhamentos: ${sidesDetails.join(', ')}`;

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
    setSelectedAccompaniments([]);
  };

  const handleClose = () => {
    onOpenChange(false);
    setQuantity(1);
    setSelectedAccompaniments([]);
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

          {/* Accompaniments Selection */}
          <div className="space-y-3">
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
              <div className="grid grid-cols-2 gap-2">
                {accompaniments.map((side) => {
                  const selected = getSelectedItem(side.id);
                  const isSelected = !!selected;
                  const itemQty = selected?.quantity || 0;
                  
                  return (
                    <div
                      key={side.id}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer min-h-[80px] ${
                        isSelected 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                      onClick={() => !isSelected && handleToggle(side.id)}
                    >
                      {/* Name */}
                      <span className="text-sm font-medium text-center mb-1 line-clamp-2">
                        {side.name}
                      </span>
                      
                      {/* Price */}
                      {side.price > 0 && (
                        <span className="text-xs text-muted-foreground">
                          R$ {side.price.toFixed(2)}
                        </span>
                      )}
                      
                      {/* Quantity Controls - show when selected */}
                      {isSelected && (
                        <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => handleQuantityChange(side.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-bold text-sm w-5 text-center">{itemQty}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => handleQuantityChange(side.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="text-xs space-y-1">
              {totalSelectedCount < FREE_SIDES_COUNT && (
                <p className="text-destructive">
                  * Obrigatório escolher {FREE_SIDES_COUNT} acompanhamentos (grátis)
                </p>
              )}
              {totalSelectedCount >= FREE_SIDES_COUNT && (
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