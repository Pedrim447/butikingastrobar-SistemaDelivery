import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product, Category } from "@/types";
import { HeroSection } from "@/components/HeroSection";
import { CategoryNav } from "@/components/CategoryNav";
import { CategorySection } from "@/components/CategorySection";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu as MenuIcon, Package, LogOut, Tag, Info, ChevronRight, Shield, User, MessageCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useGuestMode } from "@/hooks/useGuestMode";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ShareMenuButton } from "@/components/ShareMenuButton";

const Menu = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { getCartItemsCount, getCartTotal } = useCart();
  const { guestToken, guestData, clearGuestData } = useGuestMode();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    if (user) {
      fetchUserProfile();
      fetchUserRole();
    }
  }, [user]);

  // Buscar pedidos ativos quando o usuário ou guest token mudar
  useEffect(() => {
    if (user || guestToken) {
      fetchActiveOrders();
    }
  }, [user, guestToken]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user profile:", error);
        return;
      }
      
      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return;
      }
      
      if (data) {
        const roleLabels: Record<string, string> = {
          'admin': 'Administrador',
          'delivery_rider': 'Entregador',
          'user': 'Cliente'
        };
        setUserRole(roleLabels[data.role] || 'Cliente');
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      let query = supabase
        .from("orders")
        .select("*")
        .in("status", ["pending", "preparing", "out_for_delivery"])
        .order("created_at", { ascending: false });

      // Se usuário está logado, busca por user_id
      if (user) {
        query = query.eq("user_id", user.id);
      } 
      // Se é convidado, busca por guest_token
      else if (guestToken) {
        query = query.eq("guest_token", guestToken);
      }
      // Se não tem usuário nem guest_token, não busca
      else {
        return;
      }

      const { data, error } = await query;

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
      const [categoriesRes, productsRes, sideDishesRes] = await Promise.all([
        supabase.from("categories").select("*").order("display_order"),
        supabase.from("products").select("*").eq("is_available", true),
        supabase.from("side_dishes").select("*").eq("is_available", true).eq("show_as_product", true),
      ]);

      if (categoriesRes.error) {
        console.error("Error fetching categories:", categoriesRes.error);
      } else if (categoriesRes.data) {
        setCategories(categoriesRes.data);
      }

      // Combine products with side dishes that should show as products
      let allProducts: Product[] = [];
      
      if (productsRes.error) {
        console.error("Error fetching products:", productsRes.error);
      } else if (productsRes.data) {
        allProducts = [...productsRes.data];
      }

      // Add side dishes as products (with null category_id - they'll appear in a special section or need category assignment)
      if (sideDishesRes.error) {
        console.error("Error fetching side dishes as products:", sideDishesRes.error);
      } else if (sideDishesRes.data) {
        const sideDishProducts: Product[] = sideDishesRes.data.map(sd => ({
          id: `sidedish_${sd.id}`,
          name: sd.name,
          description: null,
          price: sd.price,
          image_url: null,
          category_id: null, // Will appear in "Outros" category or need to be assigned
          is_available: sd.is_available,
          created_at: sd.created_at,
          updated_at: sd.updated_at,
        }));
        allProducts = [...allProducts, ...sideDishProducts];
      }

      setProducts(allProducts);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      const offset = 140; // Account for sticky headers
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
  };

  const getProductsByCategory = (categoryId: string | null) => {
    return products.filter((p) => p.category_id === categoryId);
  };

  // Get products without category (side dishes shown as products)
  const uncategorizedProducts = products.filter((p) => p.category_id === null);

  const cartCount = getCartItemsCount();
  const cartTotal = getCartTotal();
  const hasActiveOrders = activeOrders.length > 0;

  const handleLogoutGuest = () => {
    clearGuestData();
    toast.success("Você saiu do modo convidado");
    setMobileMenuOpen(false);
    window.location.reload();
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Você saiu da sua conta");
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="px-4 md:px-6 py-3">
          {/* Status Bar */}
          <div className="flex items-center justify-end mb-3 pb-3 border-b border-border/50">
            {user && userProfile ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-base font-semibold">{userProfile.name}</p>
                  {userRole && (
                    <p className="text-sm text-muted-foreground">{userRole}</p>
                  )}
                </div>
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
              </div>
            ) : guestData?.name ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-base font-semibold">{guestData.name}</p>
                  <p className="text-sm text-muted-foreground">Modo Convidado</p>
                </div>
                <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-base text-muted-foreground">Visitante</p>
                </div>
                <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-11 w-11">
                  <MenuIcon className="w-6 h-6" />
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
                          {user && userProfile 
                            ? `Olá, ${userProfile.name}!` 
                            : guestData?.name 
                            ? `Olá, ${guestData.name}!` 
                            : 'Menu'}
                        </h2>
                        {guestData?.name && (
                          <p className="text-xs text-muted-foreground">(convidado)</p>
                        )}
                        {user && userProfile && (
                          <p className="text-xs text-muted-foreground">(conta)</p>
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
                          if (categories.length > 0) {
                            scrollToCategory(categories[0].id);
                          }
                          setMobileMenuOpen(false);
                        }}
                      >
                        <MenuIcon className="w-5 h-5 mr-3" />
                        Cardápio
                      </Button>

                      <Button
                        variant="ghost"
                        className="justify-start h-12 text-base"
                        onClick={() => {
                          navigate('/meus-pedidos');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Package className="w-5 h-5 mr-3" />
                        Meus Pedidos
                        {hasActiveOrders && (
                          <span className="ml-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
                        )}
                      </Button>

                      {user ? (
                        <Button
                          variant="ghost"
                          className="justify-start h-12 text-base"
                          onClick={handleLogout}
                        >
                          <LogOut className="w-5 h-5 mr-3" />
                          Sair
                        </Button>
                      ) : guestData?.name && (
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

                      <div className="border-t pt-4 mt-4 space-y-1">
                        <Button
                          variant="outline"
                          className="w-full justify-start h-12 text-base"
                          onClick={() => {
                            console.log('Navegando para /auth (mobile)');
                            navigate('/auth');
                            setMobileMenuOpen(false);
                          }}
                        >
                          <Shield className="w-5 h-5 mr-3" />
                          Área de Login
                        </Button>
                      </div>
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            {/* Brand */}
            <h1 className="text-2xl md:text-3xl font-bold text-primary">
              Butikin Gastrobar
            </h1>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex h-11 w-11"
                onClick={() => navigate('/meus-pedidos')}
              >
                <Package className="h-6 w-6" />
              </Button>
              
              <Button
                variant="default"
                className="relative h-11 px-4"
                onClick={() => navigate("/cart")}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline text-base">Carrinho</span>
                {cartCount > 0 && (
                  <span className="ml-2 bg-primary-foreground text-primary rounded-full w-6 h-6 text-sm flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <HeroSection />

      {/* Category Navigation */}
      {!loading && (
        <CategoryNav 
          categories={categories} 
          activeCategory={activeCategory}
          onCategoryClick={scrollToCategory}
        />
      )}

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
            
            {/* Uncategorized products (side dishes shown as products) */}
            {uncategorizedProducts.length > 0 && (
              <div id="category-acompanhamentos">
                <CategorySection
                  category={{ id: 'acompanhamentos', name: 'Acompanhamentos', slug: 'acompanhamentos', display_order: 999 }}
                  products={uncategorizedProducts}
                />
              </div>
            )}
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
