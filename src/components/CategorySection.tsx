import { useState } from 'react';
import { Product, Category } from '@/types';
import { ProductCard } from './ProductCard';
import { Button } from './ui/button';
import { ChevronRight } from 'lucide-react';

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
  
  // Show first 4 products by default, or all if expanded
  const displayProducts = expanded ? products : products.slice(0, 4);
  const hasMore = products.length > 4;

  if (products.length === 0) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        {/* Category Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              {category.name}
            </h2>
            <div className="h-1 w-16 bg-gradient-to-r from-primary to-secondary rounded-full" />
          </div>
          
          {hasMore && !expanded && (
            <Button
              variant="ghost"
              onClick={() => setExpanded(true)}
              className="text-primary"
            >
              Ver Todos
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Show Less Button */}
        {hasMore && expanded && (
          <div className="text-center mt-6">
            <Button
              variant="outline"
              onClick={() => setExpanded(false)}
            >
              Mostrar Menos
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};