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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Printer, Search, ArrowLeft, AlertTriangle, CreditCard, DollarSign, Wallet, QrCode, Power } from "lucide-react";
import { OrderItemsGrouped } from "@/components/OrderItemsGrouped";
import { ShareMenuButton } from "@/components/ShareMenuButton";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { Switch } from "@/components/ui/switch";

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
  delivery_rider_id: string | null;
  cancellation_reason: string | null;
  tracking_code: string | null;
  payment_method: 'pix' | 'dinheiro' | 'cartao_debito' | 'cartao_credito' | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'cancelled' | null;
  order_items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    product_price: number;
    notes: string;
  }>;
}

interface DeliveryRider {
  id: string;
  name: string;
  phone: string;
  delivery_active: boolean;
}

export default function AdminDashboard() {
  const { user, isAdmin, signOut, loading: authLoading, checkingRole } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryRiders, setDeliveryRiders] = useState<DeliveryRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [selectedRiderId, setSelectedRiderId] = useState<string>("");
  const [selectedOrderForRider, setSelectedOrderForRider] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const { isOpen: storeOpen, toggleOrdering, manualClosed } = useStoreStatus();
  const [togglingStore, setTogglingStore] = useState(false);
  useEffect(() => {
    // Aguarda o carregamento completo da autenticação E verificação de role
    if (authLoading || checkingRole) return;

    if (!user) {
      console.log('AdminDashboard: No user, redirecting to /auth');
      navigate("/auth", { replace: true });
      return;
    }
    
    if (!isAdmin) {
      console.log('AdminDashboard: User is not admin, redirecting to /');
      navigate("/", { replace: true });
      return;
    }

    console.log('AdminDashboard: User is admin, fetching data');
    fetchOrders();
    fetchDeliveryRiders();
  }, [user, isAdmin, navigate, authLoading, checkingRole]);

  // Configurar realtime para escutar novos pedidos e atualizações
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('Novo pedido recebido:', payload);
          
          // Buscar os dados completos do pedido incluindo order_items
          const { data: newOrder, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', payload.new.id)
            .single();

          if (!error && newOrder) {
            setOrders(prevOrders => [newOrder as Order, ...prevOrders]);
            
            // Notificação de novo pedido
            toast.success('Novo pedido recebido!', {
              description: `Pedido de ${newOrder.customer_name}`,
              duration: 5000,
            });
            
            // Som de notificação (opcional)
            const audio = new Audio('/notification.mp3');
            audio.play().catch(e => console.log('Could not play notification sound'));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('Pedido atualizado:', payload);
          
          // Buscar os dados completos do pedido atualizado
          const { data: updatedOrder, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', payload.new.id)
            .single();

          if (!error && updatedOrder) {
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === updatedOrder.id ? updatedOrder as Order : order
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders((ordersData as Order[]) || []);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryRiders = async () => {
    try {
      // Buscar user_ids com role delivery_rider
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "delivery_rider");

      if (rolesError) throw rolesError;

      const userIds = rolesData?.map(r => r.user_id) || [];

      // Busca perfis de motoboys aprovados e ativos
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, phone, delivery_active")
        .in("id", userIds)
        .eq("delivery_active", true)
        .eq("delivery_approved", true)
        .order("name");

      if (error) throw error;
      setDeliveryRiders(data || []);
    } catch (error) {
      console.error("Erro ao buscar motoboys:", error);
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

  const assignRiderToOrder = async (orderId: string, riderId: string) => {
    if (!orderId || !riderId) {
      toast.error("Selecione um motoboy");
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          delivery_rider_id: riderId,
          status: "out_for_delivery"
        })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Motoboy atribuído!");
      fetchOrders();
    } catch (error) {
      console.error("Erro ao atribuir motoboy:", error);
      toast.error("Erro ao atribuir motoboy");
    }
  };

  const cancelOrder = async () => {
    if (!selectedOrderForRider || !cancellationReason.trim()) {
      toast.error("Informe o motivo do cancelamento");
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "cancelled",
          cancellation_reason: cancellationReason
        })
        .eq("id", selectedOrderForRider);

      if (error) throw error;

      toast.success("Pedido cancelado");
      setCancelDialogOpen(false);
      setCancellationReason("");
      setSelectedOrderForRider(null);
      fetchOrders();
    } catch (error) {
      console.error("Erro ao cancelar pedido:", error);
      toast.error("Erro ao cancelar pedido");
    }
  };

  const printLabel = (order: Order) => {
    const orderNumber = order.tracking_code || order.id.substring(0, 8).toUpperCase();
    const labelContent = `
=================================
        ETIQUETA DE ENTREGA
=================================

Pedido: #${orderNumber}
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
    link.download = `etiqueta-pedido-${orderNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Etiqueta gerada com sucesso!");
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
      pending: { label: "Aguardando Confirmação", variant: "outline", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      preparing: { label: "Em Produção", variant: "secondary" },
      out_for_delivery: { label: "Saiu p/ Entrega", variant: "default", className: "bg-orange-500 text-white" },
      delivered: { label: "Entregue", variant: "default", className: "bg-green-500 text-white" },
      cancelled: { label: "Cancelado", variant: "destructive" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const getPaymentMethodBadge = (method: string | null) => {
    if (!method) return null;
    
    const methodMap: Record<string, { label: string; icon: any }> = {
      pix: { label: "PIX", icon: QrCode },
      dinheiro: { label: "Dinheiro", icon: DollarSign },
      cartao_debito: { label: "Déb.", icon: CreditCard },
      cartao_credito: { label: "Créd.", icon: Wallet },
    };

    const methodInfo = methodMap[method];
    if (!methodInfo) return <Badge variant="outline">{method}</Badge>;

    const Icon = methodInfo.icon;
    return (
      <Badge variant="outline" className="gap-1">
        <Icon className="w-3 h-3" />
        {methodInfo.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string | null, method: string | null) => {
    // Status de pagamento só aparece para PIX
    if (!status || method !== 'pix') return null;
    
    // Apenas mostrar status válidos para PIX
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Aguardando", variant: "outline" },
      paid: { label: "Pago", variant: "default" },
      cancelled: { label: "Cancelado", variant: "destructive" },
    };

    // Não mostrar status inválidos ou desconhecidos
    if (!statusMap[status]) return null;
    
    const statusInfo = statusMap[status];
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const shouldShowPaymentWarning = (order: Order) => {
    return order.payment_method === 'pix' && 
           order.payment_status !== 'paid' && 
           (order.status === 'preparing' || order.status === 'out_for_delivery');
  };

  const filterOrders = (status?: string) => {
    let filtered = orders;
    
    // Filter by order type (online/pdv)
    if (tipoFilter !== "all") {
      filtered = filtered.filter(order => 
        (order as any).tipo_pedido === tipoFilter || 
        (!((order as any).tipo_pedido) && tipoFilter === "online")
      );
    }
    
    // Filter by status
    if (status && status !== "all") {
      filtered = filtered.filter(order => order.status === status);
    } else if (status === "all") {
      // "Histórico" shows only delivered and cancelled orders
      filtered = filtered.filter(order => order.status === "delivered" || order.status === "cancelled");
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

  if (authLoading || loading) {
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
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
              <p className="text-muted-foreground">Gerencie todos os pedidos</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Store Toggle */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${manualClosed ? 'bg-destructive/10 border-destructive/30' : 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'}`}>
                <Power className={`h-4 w-4 ${manualClosed ? 'text-destructive' : 'text-green-600'}`} />
                <span className={`text-sm font-medium ${manualClosed ? 'text-destructive' : 'text-green-700 dark:text-green-400'}`}>
                  {manualClosed ? 'Loja Fechada' : 'Loja Aberta'}
                </span>
                <Switch
                  checked={!manualClosed}
                  disabled={togglingStore}
                  onCheckedChange={async () => {
                    setTogglingStore(true);
                    try {
                      await toggleOrdering();
                      toast.success(manualClosed ? 'Sistema de pedidos ativado!' : 'Sistema de pedidos desativado!');
                    } catch {
                      toast.error('Erro ao alterar status da loja');
                    } finally {
                      setTogglingStore(false);
                    }
                  }}
                />
              </div>
              <ShareMenuButton />
              <Button variant="outline" onClick={handleSignOut}>
                Sair
              </Button>
            </div>
          </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Aguardando Confirmação ({filterOrders("pending").length})</TabsTrigger>
            <TabsTrigger value="preparing">Em Produção ({filterOrders("preparing").length})</TabsTrigger>
            <TabsTrigger value="out_for_delivery">Saiu p/ Entrega ({filterOrders("out_for_delivery").length})</TabsTrigger>
            <TabsTrigger value="all">Histórico ({orders.filter(o => o.status === "delivered" || o.status === "cancelled").length})</TabsTrigger>
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
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo de pedido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="online">Pedidos Online</SelectItem>
                  <SelectItem value="pdv">Pedidos PDV</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="preparing">Em Produção</SelectItem>
                  <SelectItem value="out_for_delivery">Saiu p/ Entrega</SelectItem>
                  <SelectItem value="delivered">Concluídos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border">
              <Table>
                 <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Nº Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterOrders("all").map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-bold text-primary">
                        #{order.tracking_code || order.id.substring(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium">{order.customer_name}</TableCell>
                      <TableCell>{order.customer_phone}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Ver Itens ({order.order_items.length})
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Itens do Pedido</DialogTitle>
                            </DialogHeader>
                            <OrderItemsGrouped items={order.order_items} />
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getPaymentMethodBadge(order.payment_method)}
                          {getPaymentStatusBadge(order.payment_status, order.payment_method)}
                        </div>
                      </TableCell>
                      <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap items-center">
                          {order.status === "pending" && (
                            <Button size="sm" onClick={() => updateOrderStatus(order.id, "preparing")}>
                              Iniciar Produção
                            </Button>
                          )}
                          {order.status === "preparing" && (
                            <div className="flex gap-2 items-center">
                              <Select 
                                value={order.delivery_rider_id || ""} 
                                onValueChange={(riderId) => {
                                  assignRiderToOrder(order.id, riderId);
                                }}
                              >
                                <SelectTrigger className="w-[180px] h-9">
                                  <SelectValue placeholder="Selecionar Motoboy" />
                                </SelectTrigger>
                                <SelectContent>
                                  {deliveryRiders.map((rider) => (
                                    <SelectItem key={rider.id} value={rider.id}>
                                      {rider.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {shouldShowPaymentWarning(order) && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          )}
                          <Button size="sm" variant="outline" onClick={() => printLabel(order)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          {order.status !== "cancelled" && order.status !== "delivered" && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setSelectedOrderForRider(order.id)}
                                >
                                  Cancelar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Cancelar Pedido</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Motivo do Cancelamento</Label>
                                    <Textarea
                                      value={cancellationReason}
                                      onChange={(e) => setCancellationReason(e.target.value)}
                                      placeholder="Informe o motivo..."
                                      rows={3}
                                    />
                                  </div>
                                  <Button onClick={cancelOrder} variant="destructive" className="w-full">
                                    Confirmar Cancelamento
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {["pending", "preparing", "out_for_delivery"].map((status) => (
            <TabsContent key={status} value={status}>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Nº Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterOrders(status).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-bold text-primary">
                          #{order.tracking_code || order.id.substring(0, 8).toUpperCase()}
                        </TableCell>
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
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getPaymentMethodBadge(order.payment_method)}
                            {getPaymentStatusBadge(order.payment_status, order.payment_method)}
                          </div>
                        </TableCell>
                        <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap items-center">
                            {order.status === "pending" && (
                              <Button size="sm" onClick={() => updateOrderStatus(order.id, "preparing")}>
                                Iniciar Produção
                              </Button>
                            )}
                            {order.status === "preparing" && (
                              <div className="flex gap-2 items-center">
                                <Select 
                                  value={order.delivery_rider_id || ""} 
                                  onValueChange={(riderId) => {
                                    assignRiderToOrder(order.id, riderId);
                                  }}
                                >
                                  <SelectTrigger className="w-[180px] h-9">
                                    <SelectValue placeholder="Selecionar Motoboy" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {deliveryRiders.map((rider) => (
                                      <SelectItem key={rider.id} value={rider.id}>
                                        {rider.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {shouldShowPaymentWarning(order) && (
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                )}
                              </div>
                            )}
                            <Button size="sm" variant="outline" onClick={() => printLabel(order)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            {order.status !== "cancelled" && order.status !== "delivered" && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setSelectedOrderForRider(order.id)}
                                  >
                                    Cancelar
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Cancelar Pedido</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Motivo do Cancelamento</Label>
                                      <Textarea
                                        value={cancellationReason}
                                        onChange={(e) => setCancellationReason(e.target.value)}
                                        placeholder="Informe o motivo..."
                                        rows={3}
                                      />
                                    </div>
                                    <Button onClick={cancelOrder} variant="destructive" className="w-full">
                                      Confirmar Cancelamento
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
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