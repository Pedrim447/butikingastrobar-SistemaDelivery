import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product, Category } from "@/types";
import { HeroSection } from "@/components/HeroSection";
import { CategorySection } from "@/components/CategorySection";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu as MenuIcon, Package, LogIn } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Menu = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { getCartItemsCount, getCartTotal } = useCart();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        supabase.from("categories").select("*").order("display_order"),
        supabase.from("products").select("*").eq("is_available", true),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (productsRes.data) setProducts(productsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToMenu = () => {
    menuRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getProductsByCategory = (categoryId: string) => {
    return products.filter((p) => p.category_id === categoryId);
  };

  const cartCount = getCartItemsCount();
  const cartTotal = getCartTotal();

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <MenuIcon className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="flex flex-col gap-6 mt-6">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <MenuIcon className="w-8 h-8 text-primary" />
                    <h2 className="text-xl font-bold text-primary">Butikin Gastrobar</h2>
                  </div>

                  <nav className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        navigate('/meus-pedidos');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Meus Pedidos
                    </Button>

                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        navigate('/auth');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Painel Administrativo
                    </Button>
                    
                    <div className="border-t pt-2 mt-2">
                      <p className="text-sm font-semibold text-muted-foreground mb-2 px-3">
                        Categorias
                      </p>
                      {categories.map((category) => (
                        <Button
                          key={category.id}
                          variant="ghost"
                          className="justify-start w-full"
                          onClick={() => {
                            const element = document.getElementById(`category-${category.id}`);
                            element?.scrollIntoView({ behavior: 'smooth' });
                            setMobileMenuOpen(false);
                          }}
                        >
                          {category.name}
                        </Button>
                      ))}
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            {/* Brand */}
            <h1 className="text-xl md:text-2xl font-bold text-primary">
              Butikin Gastrobar
            </h1>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex"
                onClick={() => navigate('/meus-pedidos')}
              >
                <Package className="h-5 w-5" />
              </Button>
              
              <Button
                variant="default"
                size="sm"
                className="relative"
                onClick={() => navigate("/cart")}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Carrinho</span>
                {cartCount > 0 && (
                  <span className="ml-2 bg-primary-foreground text-primary rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <HeroSection onOrderNow={scrollToMenu} />

      {/* Menu Sections */}
      <div ref={menuRef}>
        {loading ? (
          <div className="container mx-auto px-4 py-8">
            <div className="space-y-12">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-80" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id} id={`category-${category.id}`}>
                <CategorySection
                  category={category}
                  products={getProductsByCategory(category.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button (Mobile) */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 right-4 z-40 md:hidden">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 px-6"
            onClick={() => navigate("/cart")}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {cartCount} {cartCount === 1 ? 'item' : 'itens'}
            <span className="ml-2 font-bold">
              R$ {cartTotal.toFixed(2)}
            </span>
          </Button>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-card border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-lg font-bold text-primary mb-2">
            Butikin Gastrobar
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sabor autêntico em cada pedido
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <span>Segunda a Domingo: 11h às 23h</span>
            <span>•</span>
            <span>Entrega rápida</span>
            <span>•</span>
            <span>(00) 0000-0000</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Menu;
