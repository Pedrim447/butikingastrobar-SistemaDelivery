import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

const SAUCE_OPTIONS = [
  { id: 'maionese', label: 'Maionese da casa' },
  { id: 'ketchup', label: 'Ketchup' },
  { id: 'none', label: 'Não desejo molho adicional.' },
];

const NAPKIN_OPTIONS = [
  { id: 'yes', label: 'Desejo guardanapo.' },
  { id: 'no', label: 'Não desejo guardanapo.' },
];

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
  const [selectedSauce, setSelectedSauce] = useState('none');
  const [selectedNapkin, setSelectedNapkin] = useState('no');
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
    const sauceLabel = SAUCE_OPTIONS.find(s => s.id === selectedSauce)?.label || '';
    const napkinLabel = NAPKIN_OPTIONS.find(n => n.id === selectedNapkin)?.label || '';
    const extrasLabels = selectedExtras
      .map(id => {
        const extra = EXTRA_TOPPINGS.find(e => e.id === id);
        return extra ? `${extra.name} (+R$ ${extra.price.toFixed(2)})` : '';
      })
      .filter(Boolean);

    const notes = [
      sauceLabel,
      napkinLabel,
      ...extrasLabels,
    ].join(', ');

    addToCart(product, quantity, notes);
    toast.success(`${product.name} adicionado ao carrinho!`);
    onOpenChange(false);
    
    // Reset form
    setQuantity(1);
    setSelectedSauce('none');
    setSelectedNapkin('no');
    setSelectedExtras([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Product Image */}
        <div className="relative w-full h-64 bg-muted">
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

        <div className="p-6 space-y-6">
          {/* Product Info */}
          <div>
            <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
            {product.description && (
              <p className="text-muted-foreground">{product.description}</p>
            )}
          </div>

          {/* Sauce Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Vai uma maionese caseira extra? Ketchup?</h3>
              <Badge variant="destructive">Obrigatório</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Escolha entre 1 e 2 opções</p>
            <RadioGroup value={selectedSauce} onValueChange={setSelectedSauce}>
              {SAUCE_OPTIONS.map(option => (
                <div key={option.id} className="flex items-center space-x-2 py-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="cursor-pointer flex-1">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Napkin Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Deseja guardanapo?</h3>
              <Badge variant="destructive">Obrigatório</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Escolha no mínimo 1 opção</p>
            <RadioGroup value={selectedNapkin} onValueChange={setSelectedNapkin}>
              {NAPKIN_OPTIONS.map(option => (
                <div key={option.id} className="flex items-center space-x-2 py-2">
                  <RadioGroupItem value={option.id} id={`napkin-${option.id}`} />
                  <Label htmlFor={`napkin-${option.id}`} className="cursor-pointer flex-1">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Extra Toppings */}
          <div className="space-y-3">
            <h3 className="font-semibold">Deseja molho adicional?</h3>
            <p className="text-sm text-muted-foreground">Opcional</p>
            <div className="space-y-2">
              {EXTRA_TOPPINGS.map(extra => (
                <div
                  key={extra.id}
                  className="flex items-center justify-between py-2 border-b"
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={extra.id}
                      checked={selectedExtras.includes(extra.id)}
                      onCheckedChange={() => handleExtraToggle(extra.id)}
                    />
                    <Label htmlFor={extra.id} className="cursor-pointer">
                      {extra.name}
                    </Label>
                  </div>
                  <span className="text-sm font-medium">
                    +R$ {extra.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with quantity and add button */}
        <div className="sticky bottom-0 bg-card border-t p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">
              R$ {calculateTotal().toFixed(2)}
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="font-bold text-lg w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button onClick={handleAddToCart} className="w-full" size="lg">
            <ShoppingBag className="w-4 h-4 mr-2" />
            ADICIONAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
