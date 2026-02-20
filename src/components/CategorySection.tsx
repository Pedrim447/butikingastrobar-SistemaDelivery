import { Product, Category } from '@/types';
import { ProductCard } from './ProductCard';
import { ProductCardCompact } from './ProductCardCompact';
import { useIsMobile } from '@/hooks/use-mobile';

interface CategorySectionProps {
  category: Category;
  products: Product[];
  showAll?: boolean;
}

export const CategorySection: React.FC<CategorySectionProps> = ({ 
  category, 
  products,
}) => {
  const isMobile = useIsMobile();

  if (products.length === 0) return null;

  return (
    <section className="py-4 md:py-8">
      <div className="container mx-auto px-3 md:px-4">
        {/* Category Header */}
        <div className="mb-3 md:mb-6">
          <h2 className="text-lg md:text-3xl font-bold text-foreground">
            {category.name}
          </h2>
          <div className="h-0.5 md:h-1 w-10 md:w-16 bg-gradient-to-r from-primary to-secondary rounded-full mt-1" />
        </div>

        {/* Products Grid */}
        {isMobile ? (
          <div className="grid grid-cols-2 gap-2">
            {products.map((product) => (
              <ProductCardCompact key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
