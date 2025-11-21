import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product, Category } from "@/types";
import { HeroSection } from "@/components/HeroSection";
import { CategorySection } from "@/components/CategorySection";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu as MenuIcon, Package, LogOut, Tag, Info, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useGuestMode } from "@/hooks/useGuestMode";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const Menu = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const { getCartItemsCount, getCartTotal } = useCart();
  const { guestData, clearGuestData } = useGuestMode();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    fetchActiveOrders();
  }, [guestData.id]);

  const fetchActiveOrders = async () => {
    if (!guestData.id) return;
    
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("guest_id", guestData.id)
        .in("status", ["pending", "preparing", "out_for_delivery"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching active orders:", error);
      } else if (data) {
        setActiveOrders(data);
      }
    } catch (error) {
      console.error("Error fetching active orders:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        supabase.from("categories").select("*").order("display_order"),
        supabase.from("products").select("*").eq("is_available", true),
      ]);

      if (categoriesRes.error) {
        console.error("Error fetching categories:", categoriesRes.error);
      } else if (categoriesRes.data) {
        setCategories(categoriesRes.data);
      }

      if (productsRes.error) {
        console.error("Error fetching products:", productsRes.error);
      } else if (productsRes.data) {
        setProducts(productsRes.data);
      }
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
  const hasActiveOrders = activeOrders.length > 0;

  const handleLogoutGuest = () => {
    clearGuestData();
    toast.success("Você saiu do modo convidado");
    setMobileMenuOpen(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden relative">
                  <MenuIcon className="w-5 h-5" />
                  {hasActiveOrders && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="p-6 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <MenuIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">
                          {guestData.name ? `Olá, ${guestData.name}!` : 'Menu'}
                        </h2>
                        {guestData.name && (
                          <p className="text-xs text-muted-foreground">(convidado)</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Active Orders Section */}
                  {hasActiveOrders && (
                    <div className="p-4 bg-muted/30">
                      <Card className="border-primary/20 bg-background">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-muted-foreground mb-1">
                                #{activeOrders[0].tracking_code}
                              </p>
                              <p className="font-semibold mb-2">
                                Pedido em andamento!
                              </p>
                              <p className="text-xs text-muted-foreground mb-3">
                                {activeOrders[0].status === 'pending' && 'Pedido confirmado pelo estabelecimento.'}
                                {activeOrders[0].status === 'preparing' && 'Seu pedido está sendo preparado.'}
                                {activeOrders[0].status === 'out_for_delivery' && 'Pedido saiu para entrega!'}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-between"
                                onClick={() => {
                                  navigate('/meus-pedidos');
                                  setMobileMenuOpen(false);
                                }}
                              >
                                Acompanhar
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Menu Items */}
                  <nav className="flex-1 overflow-y-auto p-4">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        className="justify-start h-12 text-base"
                        onClick={() => {
                          scrollToMenu();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <MenuIcon className="w-5 h-5 mr-3" />
                        Cardápio
                      </Button>

                      {guestData.name && (
                        <Button
                          variant="ghost"
                          className="justify-start h-12 text-base"
                          onClick={handleLogoutGuest}
                        >
                          <LogOut className="w-5 h-5 mr-3" />
                          Sair do modo convidado
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        className="justify-start h-12 text-base"
                        onClick={() => {
                          toast.info("Em breve!");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Tag className="w-5 h-5 mr-3" />
                        Cupons de Desconto
                      </Button>

                      <Button
                        variant="ghost"
                        className="justify-start h-12 text-base"
                        onClick={() => {
                          toast.info("Em breve!");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Info className="w-5 h-5 mr-3" />
                        Sobre Nós
                      </Button>

                      <div className="border-t pt-4 mt-4">
                        <Button
                          variant="outline"
                          className="w-full justify-start h-12 text-base"
                          onClick={() => {
                            navigate('/delivery-auth');
                            setMobileMenuOpen(false);
                          }}
                        >
                          <Package className="w-5 h-5 mr-3" />
                          Área do Entregador
                        </Button>
                      </div>
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
