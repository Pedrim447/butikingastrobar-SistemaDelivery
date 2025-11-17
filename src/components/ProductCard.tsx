import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ProductDetailDialog } from './ProductDetailDialog';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
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
        className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
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
          {!product.is_available && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Badge variant="destructive" className="text-base px-4 py-2">
                <AlertCircle className="w-4 h-4 mr-2" />
                Indisponível
              </Badge>
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-2">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">
              R$ {product.price.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      <ProductDetailDialog
        product={product}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};
