import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  LogOut,
  Printer
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  delivering: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_cep: string;
  customer_city: string;
  customer_neighborhood: string;
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

const AdminDashboard = () => {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    preparing: 0,
    delivering: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchOrders();
    }
  }, [user, isAdmin]);

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            product_name,
            quantity,
            product_price,
            notes
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(ordersData || []);

      // Calculate stats
      const stats: OrderStats = {
        total: ordersData?.length || 0,
        pending: ordersData?.filter(o => o.status === 'pending').length || 0,
        confirmed: ordersData?.filter(o => o.status === 'confirmed').length || 0,
        preparing: ordersData?.filter(o => o.status === 'preparing').length || 0,
        delivering: ordersData?.filter(o => o.status === 'out_for_delivery').length || 0,
        delivered: ordersData?.filter(o => o.status === 'delivered').length || 0,
        cancelled: ordersData?.filter(o => o.status === 'cancelled').length || 0,
        totalRevenue: ordersData?.reduce((sum, o) => sum + Number(o.total), 0) || 0,
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Status atualizado com sucesso!');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const printLabel = (order: Order) => {
    const labelContent = `
=======================================
       FASTFOOD DELIVERY
       ETIQUETA DE PEDIDO
=======================================

PEDIDO: #${order.id.substring(0, 8).toUpperCase()}
DATA: ${new Date(order.created_at).toLocaleString('pt-BR')}

---------------------------------------
CLIENTE
---------------------------------------
Nome: ${order.customer_name}
Telefone: ${order.customer_phone}

---------------------------------------
ENDEREÇO DE ENTREGA
---------------------------------------
${order.customer_address}
Bairro: ${order.customer_neighborhood || 'N/A'}
Cidade: ${order.customer_city || 'N/A'}
CEP: ${order.customer_cep}

---------------------------------------
ITENS DO PEDIDO
---------------------------------------
${order.order_items.map((item, idx) => `
${idx + 1}. ${item.product_name} x${item.quantity}
   R$ ${item.product_price.toFixed(2)} cada
   ${item.notes ? `   Obs: ${item.notes}` : ''}
`).join('\n')}

---------------------------------------
VALORES
---------------------------------------
Subtotal: R$ ${(order.total - order.delivery_fee).toFixed(2)}
Taxa de Entrega: R$ ${order.delivery_fee.toFixed(2)}
TOTAL: R$ ${order.total.toFixed(2)}

${order.notes ? `\nObservações: ${order.notes}` : ''}

=======================================
    Obrigado pela preferência!
=======================================
    `;

    // Create blob and download
    const blob = new Blob([labelContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etiqueta-pedido-${order.id.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Etiqueta gerada com sucesso!');
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      confirmed: { label: 'Confirmado', variant: 'default' },
      preparing: { label: 'Preparando', variant: 'default' },
      out_for_delivery: { label: 'Saiu para entrega', variant: 'default' },
      delivered: { label: 'Entregue', variant: 'default' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };
    
    const config = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filterOrders = (status: string) => {
    if (status === 'all') return orders;
    return orders.filter(o => o.status === status);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Painel Administrativo</h1>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.delivered}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmados</TabsTrigger>
                <TabsTrigger value="preparing">Preparando</TabsTrigger>
                <TabsTrigger value="out_for_delivery">Em Entrega</TabsTrigger>
                <TabsTrigger value="delivered">Entregues</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
              </TabsList>

              {['all', 'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map(status => (
                <TabsContent key={status} value={status}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterOrders(status).map(order => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">
                              #{order.id.substring(0, 8)}
                            </TableCell>
                            <TableCell>{order.customer_name}</TableCell>
                            <TableCell>{order.customer_phone}</TableCell>
                            <TableCell className="font-bold">R$ {order.total.toFixed(2)}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell className="text-sm">
                              {new Date(order.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {order.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                  >
                                    Confirmar
                                  </Button>
                                )}
                                {order.status === 'confirmed' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                                  >
                                    Preparar
                                  </Button>
                                )}
                                {order.status === 'preparing' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                                  >
                                    Enviar
                                  </Button>
                                )}
                                {order.status === 'out_for_delivery' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                                  >
                                    Concluir
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => printLabel(order)}
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
