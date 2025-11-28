import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Package, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Order {
  id: string;
  tracking_code: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total: number;
  status: string;
  created_at: string;
  order_items: Array<{
    product_name: string;
    quantity: number;
    product_price: number;
  }>;
}

const statusTranslations: Record<string, string> = {
  pending: 'Pendente',
  preparing: 'Em Preparo',
  out_for_delivery: 'Saiu para Entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado'
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  preparing: 'bg-orange-500',
  out_for_delivery: 'bg-purple-500',
  delivered: 'bg-success',
  cancelled: 'bg-destructive'
};

export default function MyOrders() {
  const navigate = useNavigate();
  const { guestToken, guestData } = useGuestMode();
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMyOrders, setLoadingMyOrders] = useState(false);
  const [searched, setSearched] = useState(false);

  // Automatically load user's orders on mount
  useEffect(() => {
    const loadMyOrders = async () => {
      // Se é usuário logado, busca por user_id
      if (user) {
        setLoadingMyOrders(true);
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setMyOrders(data || []);
        } catch (error) {
          console.error('Erro ao buscar pedidos do usuário:', error);
        } finally {
          setLoadingMyOrders(false);
        }
      }
      // Se é convidado, busca por guest_token
      else if (guestToken) {
        setLoadingMyOrders(true);
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('guest_token', guestToken)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setMyOrders(data || []);
        } catch (error) {
          console.error('Erro ao buscar pedidos do convidado:', error);
        } finally {
          setLoadingMyOrders(false);
        }
      }
    };

    loadMyOrders();
  }, [guestToken, user]);

  const searchOrders = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone) {
      toast.error('Por favor, digite seu telefone');
      return;
    }

    setLoading(true);
    setSearched(true);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
      
      if (data && data.length === 0) {
        toast.info('Nenhum pedido encontrado com este telefone');
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast.error('Erro ao buscar seus pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackOrder = (trackingCode: string) => {
    navigate(`/rastreamento?code=${trackingCode}`);
  };

  const renderOrderCard = (order: Order) => (
    <Card key={order.id}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              Pedido #{order.tracking_code}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(order.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <Badge className={statusColors[order.status]}>
            {statusTranslations[order.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium text-sm mb-2">Itens:</h4>
          <ul className="space-y-1 text-sm">
            {order.order_items.map((item, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{item.quantity}x {item.product_name}</span>
                <span>R$ {(item.quantity * item.product_price).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>R$ {order.total.toFixed(2)}</span>
          </div>
        </div>

        {(order.status === 'out_for_delivery' || order.status === 'preparing') && (
          <Button
            onClick={() => handleTrackOrder(order.tracking_code)}
            className="w-full"
            variant="outline"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Rastrear Pedido
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Meus Pedidos</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Tabs defaultValue="guest" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="guest" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {user ? 'Minha Conta' : 'Meus Pedidos'}
              {myOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1">{myOrders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Buscar por Telefone
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guest" className="space-y-4">
            {user ? (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <p className="text-sm">
                    <span className="font-semibold">Olá!</span>
                    <span className="text-muted-foreground ml-2">(conta)</span>
                  </p>
                </CardContent>
              </Card>
            ) : guestData?.name ? (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <p className="text-sm">
                    <span className="font-semibold">Olá, {guestData.name}!</span>
                    <span className="text-muted-foreground ml-2">(convidado)</span>
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {loadingMyOrders ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
                  <p className="text-muted-foreground">Carregando seus pedidos...</p>
                </CardContent>
              </Card>
            ) : myOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">
                    Você ainda não fez nenhum pedido
                  </p>
                  <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
                    Ver Cardápio
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">
                  Seus Pedidos ({myOrders.length})
                </h2>
                {myOrders.map(renderOrderCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Buscar Pedidos por Telefone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={searchOrders} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone usado no pedido</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Buscando...' : 'Buscar Pedidos'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {searched && orders.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhum pedido encontrado com este telefone
                  </p>
                </CardContent>
              </Card>
            )}

            {orders.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">
                  Pedidos Encontrados ({orders.length})
                </h2>
                {orders.map(renderOrderCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
