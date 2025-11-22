import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bike, Plus } from "lucide-react";

interface DeliveryRider {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminDeliveryRiders() {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [riders, setRiders] = useState<DeliveryRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
  });

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
      const { data, error } = await supabase
        .from("delivery_riders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRiders(data || []);
    } catch (error) {
      console.error("Erro ao buscar motoboys:", error);
      toast.error("Erro ao carregar motoboys");
    } finally {
      setLoading(false);
    }
  };

  const createRider = async () => {
    // Validação dos campos
    if (!formData.email || !formData.password || !formData.name || !formData.phone) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Email inválido');
      return;
    }

    // Validação de telefone (básica)
    const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Telefone inválido. Use o formato (00) 00000-0000');
      return;
    }

    try {
      // Criar usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
          },
        },
      });

      if (authError) {
        // Tratar erro de usuário já registrado
        if (authError.message.includes('User already registered') || 
            authError.message.includes('already registered') ||
            authError.message.includes('already been registered')) {
          toast.error('Este email já está cadastrado no sistema');
        } else {
          toast.error(authError.message || 'Erro ao criar conta');
        }
        return;
      }

      if (!authData.user) {
        toast.error('Erro ao criar usuário');
        return;
      }

      // Criar perfil do entregador
      const { error: riderError } = await supabase
        .from('delivery_riders')
        .insert({
          user_id: authData.user.id,
          name: formData.name,
          phone: formData.phone,
          is_active: true,
        });

      if (riderError) {
        console.error('Error creating rider profile:', riderError);
        toast.error('Erro ao criar perfil de entregador');
        return;
      }

      // Adicionar role de delivery_rider
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'delivery_rider',
        });

      if (roleError) {
        console.error('Error adding role:', roleError);
        toast.error('Erro ao configurar permissões');
        return;
      }

      toast.success('Motoboy cadastrado com sucesso!');
      setDialogOpen(false);
      setFormData({ email: '', password: '', name: '', phone: '' });
      fetchRiders();
    } catch (error: any) {
      console.error('Erro ao criar motoboy:', error);
      toast.error('Erro ao cadastrar motoboy. Tente novamente.');
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
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Motoboys</h1>
              <p className="text-muted-foreground">Gerencie os entregadores</p>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Motoboy
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Motoboy</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <Button onClick={createRider} className="w-full">
                    Cadastrar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

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
                      Nenhum motoboy cadastrado
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
        </main>
      </div>
    </SidebarProvider>
  );
}
