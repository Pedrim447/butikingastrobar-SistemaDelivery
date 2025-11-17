import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { CategoryNav } from '@/components/CategoryNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Menu as MenuIcon } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const Menu = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { getCartItemsCount, getCartTotal } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        supabase.from('categories').select('*').order('display_order'),
        supabase.from('products').select('*').eq('is_available', true)
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (productsRes.data) setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = activeCategory
    ? products.filter(p => {
        const category = categories.find(c => c.slug === activeCategory);
        return category && p.category_id === category.id;
      })
    : products;

  const cartCount = getCartItemsCount();
  const cartTotal = getCartTotal();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MenuIcon className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">FastFood Delivery</h1>
          </div>
          <Button 
            onClick={() => navigate('/cart')}
            variant="outline" 
            size="lg"
            className="relative"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Carrinho</span>
            {cartCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0">
                {cartCount}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      {/* Category Navigation */}
      {!loading && (
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryClick={setActiveCategory}
        />
      )}

      {/* Products Grid */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">
              Nenhum produto encontrado nesta categoria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      {/* Floating Cart Summary (Mobile & Desktop) */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-md">
          <Button
            onClick={() => navigate('/cart')}
            size="lg"
            className="w-full h-14 shadow-2xl flex items-center justify-between px-6"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-bold">Ver Sacola ({cartCount})</span>
            </div>
            <span className="font-bold text-lg">
              R$ {cartTotal.toFixed(2)}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Menu;
