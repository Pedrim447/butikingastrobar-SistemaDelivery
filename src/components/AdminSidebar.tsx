import { useState } from "react";
import { ShoppingBag, BarChart3, Home, LogOut, Bike, Users, Ticket, UtensilsCrossed, Salad, ChevronDown, ChevronRight, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Início", url: "/", icon: Home },
  { title: "Pedidos", url: "/admin", icon: ShoppingBag },
  { 
    title: "Cardápio", 
    icon: UtensilsCrossed,
    submenu: [
      { title: "Produtos", url: "/admin/products", icon: UtensilsCrossed },
      { title: "Acompanhamentos", url: "/admin/side-dishes", icon: Salad },
    ]
  },
  { title: "Usuários", url: "/admin/users", icon: Users },
  { title: "Motoboys", url: "/admin/delivery-riders", icon: Bike },
  { title: "Cupons", url: "/admin/coupons", icon: Ticket },
  { title: "Estatísticas", url: "/admin/stats", icon: BarChart3 },
  { title: "Configurações", url: "/admin/settings", icon: Settings },
];

interface AdminSidebarProps {
  onSignOut: () => void;
}

export function AdminSidebar({ onSignOut }: AdminSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  
  // Check if any submenu item is active
  const isSubmenuActive = (submenu: { url: string }[]) => 
    submenu.some(item => location.pathname === item.url);

  const [menuOpen, setMenuOpen] = useState(() => {
    const cardapioItem = menuItems.find(item => item.submenu);
    return cardapioItem ? isSubmenuActive(cardapioItem.submenu) : false;
  });

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Painel Administrativo</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                if (item.submenu) {
                  const isActive = isSubmenuActive(item.submenu);
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Collapsible open={menuOpen} onOpenChange={setMenuOpen}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={cn(
                              "w-full justify-between hover:bg-sidebar-accent",
                              isActive && "bg-sidebar-accent/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <item.icon className="h-4 w-4" />
                              {!collapsed && <span>{item.title}</span>}
                            </div>
                            {!collapsed && (
                              menuOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
                            {item.submenu.map((subItem) => (
                              <SidebarMenuButton key={subItem.title} asChild>
                                <NavLink
                                  to={subItem.url}
                                  end
                                  className="hover:bg-sidebar-accent text-sm"
                                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                                >
                                  <subItem.icon className="h-3.5 w-3.5" />
                                  {!collapsed && <span>{subItem.title}</span>}
                                </NavLink>
                              </SidebarMenuButton>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  );
                }
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url!}
                        end
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onSignOut}>
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}