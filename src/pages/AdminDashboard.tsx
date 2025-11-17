import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { toast } from "sonner";
import { Printer, Search } from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_cep: string;
  customer_city: string;
  customer_neighborhood: string;
  customer_state: string;
  total: number;
  delivery_fee: number;
  status: string;
  created_at: string;
  notes: string;
  order_items: Array<{
    product_name: string;
    quantity: number;
    product_price: number;
    notes: string;
  }>;
}

export default function AdminDashboard() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!isAdmin) {
      navigate("/");
      return;
    }

    fetchOrders();
  }, [user, isAdmin, navigate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(ordersData || []);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Status atualizado com sucesso!");
      fetchOrders();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const printLabel = (order: Order) => {
    const labelContent = `
=================================
        ETIQUETA DE ENTREGA
=================================

Pedido: ${order.id.substring(0, 8)}
Data: ${new Date(order.created_at).toLocaleString("pt-BR")}

---------------------------------
CLIENTE
---------------------------------
Nome: ${order.customer_name}
Telefone: ${order.customer_phone}

---------------------------------
ENDEREÇO DE ENTREGA
---------------------------------
${order.customer_address}
Bairro: ${order.customer_neighborhood}
Cidade: ${order.customer_city} - ${order.customer_state}
CEP: ${order.customer_cep}

---------------------------------
ITENS DO PEDIDO
---------------------------------
${order.order_items.map(item => `${item.quantity}x ${item.product_name} - R$ ${item.product_price.toFixed(2)}`).join("\n")}

---------------------------------
TOTAL: R$ ${order.total.toFixed(2)}
Taxa de Entrega: R$ ${order.delivery_fee.toFixed(2)}
---------------------------------

${order.notes ? `Observações: ${order.notes}` : ""}

=================================
    `;

    const blob = new Blob([labelContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `etiqueta-pedido-${order.id.substring(0, 8)}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Etiqueta gerada com sucesso!");
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "outline" },
      confirmed: { label: "Confirmado", variant: "secondary" },
      preparing: { label: "Preparando", variant: "default" },
      out_for_delivery: { label: "Saiu p/ Entrega", variant: "default" },
      delivered: { label: "Entregue", variant: "default" },
      cancelled: { label: "Cancelado", variant: "destructive" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const filterOrders = (status?: string) => {
    let filtered = orders;
    
    // Filter by status
    if (status && status !== "all") {
      filtered = filtered.filter(order => order.status === status);
    } else if (status === "all") {
      // "Todos" shows only history (exclude pending)
      filtered = filtered.filter(order => order.status !== "pending");
    }
    
    // Filter by search term (name or ID)
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Additional status filter for "all" tab
    if (status === "all" && statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    return filtered;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar onSignOut={handleSignOut} />

        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
            <p className="text-muted-foreground">Gerencie todos os pedidos</p>
          </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">Histórico ({orders.filter(o => o.status !== "pending").length})</TabsTrigger>
            <TabsTrigger value="pending">Pendentes ({filterOrders("pending").length})</TabsTrigger>
            <TabsTrigger value="preparing">Preparando ({filterOrders("preparing").length})</TabsTrigger>
            <TabsTrigger value="delivered">Entregues ({filterOrders("delivered").length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="mb-4 flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou ID do pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="confirmed">Confirmados</SelectItem>
                  <SelectItem value="preparing">Preparando</SelectItem>
                  <SelectItem value="out_for_delivery">Saiu p/ Entrega</SelectItem>
                  <SelectItem value="delivered">Entregues</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterOrders("all").map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.customer_name}</TableCell>
                      <TableCell>{order.customer_phone}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {order.order_items.map((item, idx) => (
                            <div key={idx}>
                              {item.quantity}x {item.product_name}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {order.status === "pending" && (
                            <Button size="sm" onClick={() => updateOrderStatus(order.id, "confirmed")}>
                              Confirmar
                            </Button>
                          )}
                          {order.status === "confirmed" && (
                            <Button size="sm" onClick={() => updateOrderStatus(order.id, "preparing")}>
                              Preparar
                            </Button>
                          )}
                          {order.status === "preparing" && (
                            <Button size="sm" onClick={() => updateOrderStatus(order.id, "out_for_delivery")}>
                              Enviar
                            </Button>
                          )}
                          {order.status === "out_for_delivery" && (
                            <Button size="sm" onClick={() => updateOrderStatus(order.id, "delivered")}>
                              Concluir
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => printLabel(order)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          {order.status !== "cancelled" && order.status !== "delivered" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateOrderStatus(order.id, "cancelled")}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {["pending", "preparing", "delivered"].map((status) => (
            <TabsContent key={status} value={status}>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterOrders(status).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.customer_name}</TableCell>
                        <TableCell>{order.customer_phone}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {order.order_items.map((item, idx) => (
                              <div key={idx}>
                                {item.quantity}x {item.product_name}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            {order.status === "pending" && (
                              <Button size="sm" onClick={() => updateOrderStatus(order.id, "confirmed")}>
                                Confirmar
                              </Button>
                            )}
                            {order.status === "confirmed" && (
                              <Button size="sm" onClick={() => updateOrderStatus(order.id, "preparing")}>
                                Preparar
                              </Button>
                            )}
                            {order.status === "preparing" && (
                              <Button size="sm" onClick={() => updateOrderStatus(order.id, "out_for_delivery")}>
                                Enviar
                              </Button>
                            )}
                            {order.status === "out_for_delivery" && (
                              <Button size="sm" onClick={() => updateOrderStatus(order.id, "delivered")}>
                                Concluir
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => printLabel(order)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            {order.status !== "cancelled" && order.status !== "delivered" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateOrderStatus(order.id, "cancelled")}
                              >
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
        </main>
      </div>
    </SidebarProvider>
  );
}