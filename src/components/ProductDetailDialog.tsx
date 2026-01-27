import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Product } from '@/types';
import { ShoppingBag, Minus, Plus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Extra {
  id: string;
  name: string;
  price: number;
}

const EXTRA_TOPPINGS: Extra[] = [
  { id: 'american_cheese', name: 'American Cheese', price: 6.0 },
  { id: 'bacon', name: 'Bacon Artesanal', price: 6.0 },
  { id: 'caramelized_onion', name: 'Cebola Caramelizada', price: 4.0 },
];

export const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  product,
  open,
  onOpenChange,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const { addToCart } = useCart();

  if (!product) return null;

  const handleExtraToggle = (extraId: string) => {
    setSelectedExtras(prev =>
      prev.includes(extraId)
        ? prev.filter(id => id !== extraId)
        : [...prev, extraId]
    );
  };

  const calculateTotal = () => {
    const extrasTotal = selectedExtras.reduce((total, extraId) => {
      const extra = EXTRA_TOPPINGS.find(e => e.id === extraId);
      return total + (extra?.price || 0);
    }, 0);
    return (product.price + extrasTotal) * quantity;
  };

  const handleAddToCart = () => {
    const extrasLabels = selectedExtras
      .map(id => {
        const extra = EXTRA_TOPPINGS.find(e => e.id === id);
        return extra ? `${extra.name} (+R$ ${extra.price.toFixed(2)})` : '';
      })
      .filter(Boolean);

    const notes = extrasLabels.join(', ');

    addToCart(product, quantity, notes);
    toast.success(`${product.name} adicionado ao carrinho!`);
    onOpenChange(false);
    
    // Reset form
    setQuantity(1);
    setSelectedExtras([]);
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

          {/* Extra Toppings */}
          {EXTRA_TOPPINGS.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Adicionais</h3>
              <div className="space-y-1">
                {EXTRA_TOPPINGS.map(extra => (
                  <div
                    key={extra.id}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={extra.id}
                        checked={selectedExtras.includes(extra.id)}
                        onCheckedChange={() => handleExtraToggle(extra.id)}
                      />
                      <Label htmlFor={extra.id} className="cursor-pointer text-sm">
                        {extra.name}
                      </Label>
                    </div>
                    <span className="text-sm font-medium text-primary">
                      +R$ {extra.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <Button onClick={handleAddToCart} className="flex-1 max-w-[140px]">
              <ShoppingBag className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
