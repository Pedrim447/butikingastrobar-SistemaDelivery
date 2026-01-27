import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { ShoppingBag, Minus, Plus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SideDish {
  id: string;
  name: string;
  price: number;
  display_order: number | null;
  type: 'side_dish' | 'product';
}

const MANDATORY_COUNT = 3;

export const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  product,
  open,
  onOpenChange,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [accompanimentQuantities, setAccompanimentQuantities] = useState<Record<string, number>>({});
  const [sideDishes, setSideDishes] = useState<SideDish[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    if (open) {
      fetchSideDishes();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setQuantity(1);
      setAccompanimentQuantities({});
    }
  }, [open]);

  const fetchSideDishes = async () => {
    setLoading(true);
    try {
      // Fetch from side_dishes table
      const { data: sideDishesData, error: sideDishesError } = await supabase
        .from('side_dishes')
        .select('*')
        .eq('is_available', true)
        .order('display_order');

      if (sideDishesError) throw sideDishesError;

      // Fetch products that are also side dishes
      const { data: productSideDishesData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('show_as_side_dish', true)
        .eq('is_available', true);

      if (productsError) throw productsError;

      // Combine and format
      const combined: SideDish[] = [
        ...(sideDishesData || []).map(sd => ({
          id: sd.id,
          name: sd.name,
          price: sd.price,
          display_order: sd.display_order,
          type: 'side_dish' as const,
        })),
        ...(productSideDishesData || []).map(p => ({
          id: `product_${p.id}`,
          name: p.name,
          price: p.price,
          display_order: 999, // Products come after side dishes
          type: 'product' as const,
        })),
      ];

      // Sort by display_order
      combined.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      setSideDishes(combined);
    } catch (error) {
      console.error('Error fetching side dishes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const getItemPrice = (id: string): number => {
    const item = sideDishes.find(sd => sd.id === id);
    return item?.price || 0;
  };

  const totalAccompaniments = Object.values(accompanimentQuantities).reduce((a, b) => a + b, 0);

  const calculateAccompanimentsPrice = (): number => {
    let freeRemaining = MANDATORY_COUNT;
    let totalExtra = 0;

    // Sort items by price (free items first to maximize savings for customer)
    const sortedItems = Object.entries(accompanimentQuantities)
      .filter(([_, qty]) => qty > 0)
      .sort((a, b) => {
        const priceA = getItemPrice(a[0]);
        const priceB = getItemPrice(b[0]);
        return priceA - priceB;
      });

    for (const [id, qty] of sortedItems) {
      const price = getItemPrice(id);
      for (let i = 0; i < qty; i++) {
        if (freeRemaining > 0) {
          freeRemaining--;
        } else {
          totalExtra += price;
        }
      }
    }

    return totalExtra;
  };

  const calculateTotal = (): number => {
    const accompanimentsPrice = calculateAccompanimentsPrice();
    return (product.price + accompanimentsPrice) * quantity;
  };

  const handleQuantityChange = (id: string, newQty: number) => {
    setAccompanimentQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, newQty),
    }));
  };

  const canAddToCart = totalAccompaniments >= MANDATORY_COUNT;

  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error('Selecione pelo menos 3 acompanhamentos!');
      return;
    }

    // Build notes with accompaniment details
    const selectedItems = Object.entries(accompanimentQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = sideDishes.find(sd => sd.id === id);
        if (!item) return '';
        return qty > 1 ? `${qty}x ${item.name}` : item.name;
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
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 left-4 rounded-full"
            onClick={() => onOpenChange(false)}
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

          {/* Accompaniments Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Escolha os Acompanhamentos</h3>
              <span className={`text-sm font-medium ${totalAccompaniments >= MANDATORY_COUNT ? 'text-green-600' : 'text-orange-500'}`}>
                {totalAccompaniments}/{MANDATORY_COUNT} obrigatórios
              </span>
            </div>

            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Carregando...</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {sideDishes.map(item => {
                  const qty = accompanimentQuantities[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="border rounded-lg p-3 flex flex-col items-center"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.id, qty - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center font-medium">{qty}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.id, qty + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="font-medium text-sm text-center">{item.name}</span>
                      {item.price > 0 && (
                        <span className="text-xs text-muted-foreground">
                          R$ {item.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              * Obrigatório escolher 3 acompanhamentos (grátis)
            </p>
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
