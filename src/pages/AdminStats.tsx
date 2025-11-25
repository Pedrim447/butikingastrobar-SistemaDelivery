import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { PasswordConfirmDialog } from "@/components/PasswordConfirmDialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface DailyStats {
  revenue: number;
  orders: number;
  pending: number;
  completed: number;
  cancelled: number;
}

interface MonthlyStats extends DailyStats {}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function AdminStats() {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [passwordConfirmed, setPasswordConfirmed] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    revenue: 0,
    orders: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    revenue: 0,
    orders: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aguarda o carregamento da autenticação
    if (authLoading) return;

    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!isAdmin) {
      navigate("/");
      return;
    }

    // Se não confirmou a senha ainda, mostrar dialog
    if (!passwordConfirmed) {
      setShowPasswordDialog(true);
      return;
    }

    fetchStats();
  }, [user, isAdmin, navigate, authLoading, passwordConfirmed]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Estatísticas do dia
      const { data: dailyOrders } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startOfDay.toISOString());

      // Estatísticas do mês
      const { data: monthlyOrders } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startOfMonth.toISOString());

      // Calcular estatísticas do dia
      const daily = {
        revenue: dailyOrders?.reduce((sum, order) => sum + Number(order.total), 0) || 0,
        orders: dailyOrders?.length || 0,
        pending: dailyOrders?.filter(o => o.status === 'pending').length || 0,
        completed: dailyOrders?.filter(o => o.status === 'delivered').length || 0,
        cancelled: dailyOrders?.filter(o => o.status === 'cancelled').length || 0,
      };

      // Calcular estatísticas do mês
      const monthly = {
        revenue: monthlyOrders?.reduce((sum, order) => sum + Number(order.total), 0) || 0,
        orders: monthlyOrders?.length || 0,
        pending: monthlyOrders?.filter(o => o.status === 'pending').length || 0,
        completed: monthlyOrders?.filter(o => o.status === 'delivered').length || 0,
        cancelled: monthlyOrders?.filter(o => o.status === 'cancelled').length || 0,
      };

      setDailyStats(daily);
      setMonthlyStats(monthly);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordConfirm = () => {
    setPasswordConfirmed(true);
    setShowPasswordDialog(false);
  };

  const handlePasswordCancel = () => {
    navigate("/admin");
  };

  // Mostrar loading apenas durante autenticação inicial
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  // Mostrar diálogo de senha antes de qualquer conteúdo
  if (!passwordConfirmed) {
    return (
      <PasswordConfirmDialog
        open={showPasswordDialog}
        onConfirm={handlePasswordConfirm}
        onCancel={handlePasswordCancel}
        title="Área Restrita"
        description="Informe a senha de acesso para visualizar as estatísticas"
      />
    );
  }

  // Loading das estatísticas
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  const statusData = [
    { name: 'Concluídos', value: monthlyStats.completed, color: '#10b981' },
    { name: 'Pendentes', value: monthlyStats.pending, color: '#f59e0b' },
    { name: 'Cancelados', value: monthlyStats.cancelled, color: '#ef4444' },
  ];

  const revenueData = [
    { name: 'Dia', value: dailyStats.revenue },
    { name: 'Mês', value: monthlyStats.revenue },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar onSignOut={handleSignOut} />
        
        <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estatísticas</h1>
          <p className="text-muted-foreground">Análise detalhada de vendas e pedidos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button variant="outline" onClick={async () => {
            await signOut();
            navigate('/');
          }}>
            Sair
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vendas Hoje</CardDescription>
            <CardTitle className="text-3xl">
              R$ {dailyStats.revenue.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {dailyStats.orders} pedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vendas do Mês</CardDescription>
            <CardTitle className="text-3xl">
              R$ {monthlyStats.revenue.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {monthlyStats.orders} pedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pedidos Hoje</CardDescription>
            <CardTitle className="text-3xl">{dailyStats.orders}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {dailyStats.pending} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pedidos do Mês</CardDescription>
            <CardTitle className="text-3xl">{monthlyStats.orders}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {monthlyStats.pending} pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status dos Pedidos (Mês)</CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparativo de Receita</CardTitle>
            <CardDescription>Dia vs Mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                />
                <Legend />
                <Bar dataKey="value" fill="hsl(var(--primary))" name="Receita" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Pedidos por Status (Mês)</CardTitle>
            <CardDescription>Quantidade de pedidos em cada status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { status: 'Concluídos', quantidade: monthlyStats.completed },
                  { status: 'Pendentes', quantidade: monthlyStats.pending },
                  { status: 'Cancelados', quantidade: monthlyStats.cancelled },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantidade" fill="hsl(var(--primary))" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
        </main>
      </div>
    </SidebarProvider>
  );
}