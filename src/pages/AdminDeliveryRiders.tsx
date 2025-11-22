import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bike } from "lucide-react";

interface DeliveryRider {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  is_active: boolean;
  approved: boolean;
  created_at: string;
}

export default function AdminDeliveryRiders() {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [riders, setRiders] = useState<DeliveryRider[]>([]);
  const [pendingRiders, setPendingRiders] = useState<DeliveryRider[]>([]);
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

    fetchRiders();
  }, [user, isAdmin, navigate, authLoading]);

  const fetchRiders = async () => {
    try {
      setLoading(true);
      
      // Buscar motoboys aprovados
      const { data: approvedData, error: approvedError } = await supabase
        .from("delivery_riders")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (approvedError) throw approvedError;
      setRiders(approvedData || []);

      // Buscar motoboys pendentes de aprovação
      const { data: pendingData, error: pendingError } = await supabase
        .from("delivery_riders")
        .select("*")
        .eq("approved", false)
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;
      setPendingRiders(pendingData || []);
    } catch (error) {
      console.error("Erro ao buscar motoboys:", error);
      toast.error("Erro ao carregar motoboys");
    } finally {
      setLoading(false);
    }
  };

  const approveRider = async (riderId: string) => {
    try {
      const { error } = await supabase
        .from("delivery_riders")
        .update({ approved: true, is_active: true })
        .eq("id", riderId);

      if (error) throw error;

      toast.success("Motoboy aprovado com sucesso!");
      fetchRiders();
    } catch (error) {
      console.error("Erro ao aprovar motoboy:", error);
      toast.error("Erro ao aprovar motoboy");
    }
  };

  const rejectRider = async (riderId: string) => {
    try {
      // Buscar user_id do rider
      const { data: riderData } = await supabase
        .from("delivery_riders")
        .select("user_id")
        .eq("id", riderId)
        .single();

      if (!riderData) return;

      // Deletar role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", riderData.user_id);

      // Deletar rider
      const { error } = await supabase
        .from("delivery_riders")
        .delete()
        .eq("id", riderId);

      if (error) throw error;

      toast.success("Cadastro rejeitado");
      fetchRiders();
    } catch (error) {
      console.error("Erro ao rejeitar motoboy:", error);
      toast.error("Erro ao rejeitar motoboy");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const toggleRiderStatus = async (riderId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("delivery_riders")
        .update({ is_active: !currentStatus })
        .eq("id", riderId);

      if (error) throw error;

      toast.success("Status atualizado com sucesso!");
      fetchRiders();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
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
              <h1 className="text-3xl font-bold text-foreground">Motoboys</h1>
              <p className="text-muted-foreground">Gerencie os entregadores</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/admin')}>
                Voltar
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                Sair
              </Button>
            </div>
          </div>

          {/* Pendentes de Aprovação */}
          {pendingRiders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Aguardando Aprovação ({pendingRiders.length})</h2>
              <div className="rounded-md border bg-muted/30">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Data Cadastro</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRiders.map((rider) => (
                      <TableRow key={rider.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Bike className="h-4 w-4 text-amber-500" />
                          {rider.name}
                        </TableCell>
                        <TableCell>{rider.phone}</TableCell>
                        <TableCell>{new Date(rider.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => approveRider(rider.id)}>
                              Aprovar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => rejectRider(rider.id)}>
                              Rejeitar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Motoboys Aprovados */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Motoboys Ativos</h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhum motoboy aprovado
                      </TableCell>
                    </TableRow>
                  ) : (
                    riders.map((rider) => (
                      <TableRow key={rider.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Bike className="h-4 w-4" />
                          {rider.name}
                        </TableCell>
                        <TableCell>{rider.phone}</TableCell>
                        <TableCell>
                          <Badge variant={rider.is_active ? "default" : "secondary"}>
                            {rider.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={rider.is_active}
                            onCheckedChange={() => toggleRiderStatus(rider.id, rider.is_active)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
