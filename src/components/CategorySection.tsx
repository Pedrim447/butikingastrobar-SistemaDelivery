import { useState } from 'react';
import { Product, Category } from '@/types';
import { ProductCard } from './ProductCard';
import { ProductCardCompact } from './ProductCardCompact';
import { Button } from './ui/button';
import { ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface CategorySectionProps {
  category: Category;
  products: Product[];
  showAll?: boolean;
}

export const CategorySection: React.FC<CategorySectionProps> = ({ 
  category, 
  products,
  showAll = false 
}) => {
  const [expanded, setExpanded] = useState(showAll);
  const isMobile = useIsMobile();
  
  // Show more products on mobile (6), fewer on desktop (4) by default
  const initialCount = isMobile ? 6 : 4;
  const displayProducts = expanded ? products : products.slice(0, initialCount);
  const hasMore = products.length > initialCount;

  if (products.length === 0) return null;

  return (
    <section className="py-4 md:py-8">
      <div className="container mx-auto px-3 md:px-4">
        {/* Category Header - Compact on mobile */}
        <div className="flex items-center justify-between mb-3 md:mb-6">
          <div>
            <h2 className="text-lg md:text-3xl font-bold text-foreground">
              {category.name}
            </h2>
            <div className="h-0.5 md:h-1 w-10 md:w-16 bg-gradient-to-r from-primary to-secondary rounded-full mt-1" />
          </div>
          
          {hasMore && !expanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(true)}
              className="text-primary text-xs md:text-sm h-8 px-2 md:px-4"
            >
              Ver Todos
              <ChevronRight className="h-3 w-3 md:h-4 md:w-4 ml-0.5 md:ml-1" />
            </Button>
          )}
        </div>

        {/* Products Grid - Compact cards on mobile */}
        {isMobile ? (
          <div className="grid grid-cols-2 gap-2">
            {displayProducts.map((product) => (
              <ProductCardCompact key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Show Less Button */}
        {hasMore && expanded && (
          <div className="text-center mt-4 md:mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(false)}
              className="text-xs md:text-sm"
            >
              Mostrar Menos
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};