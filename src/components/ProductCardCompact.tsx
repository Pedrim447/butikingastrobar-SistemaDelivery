import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ProductDetailDialog } from './ProductDetailDialog';

interface ProductCardCompactProps {
  product: Product;
}

export const ProductCardCompact: React.FC<ProductCardCompactProps> = ({ product }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCardClick = () => {
    if (!product.is_available) {
      toast.error('Produto indisponível no momento');
      return;
    }
    setDialogOpen(true);
  };

  return (
    <>
      <Card 
        className="overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer active:scale-[0.98]"
        onClick={handleCardClick}
      >
        {/* Compact Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Sem img</span>
            </div>
          )}
          {!product.is_available && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Badge variant="destructive" className="text-xs px-2 py-1">
                <AlertCircle className="w-3 h-3 mr-1" />
                Indisponível
              </Badge>
            </div>
          )}
        </div>
        
        {/* Compact Content */}
        <div className="p-2">
          <h3 className="font-semibold text-xs leading-tight line-clamp-2 mb-1">{product.name}</h3>
          <span className="text-sm font-bold text-primary">
            R$ {product.price.toFixed(2)}
          </span>
        </div>
      </Card>

      <ProductDetailDialog
        product={product}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};
