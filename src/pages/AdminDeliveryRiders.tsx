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
import { Bike, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface DeliveryRider {
  id: string;
  name: string;
  phone: string;
  delivery_approved: boolean;
  delivery_active: boolean;
  created_at: string;
}

const createRiderSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  phone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export default function AdminDeliveryRiders() {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [riders, setRiders] = useState<DeliveryRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const form = useForm<z.infer<typeof createRiderSchema>>({
    resolver: zodResolver(createRiderSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
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
      
      // Buscar perfis com role de delivery_rider
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "delivery_rider");

      if (rolesError) throw rolesError;

      const userIds = rolesData?.map(r => r.user_id) || [];

      if (userIds.length === 0) {
        setRiders([]);
        return;
      }

      // Buscar perfis dos motoboys
      const { data: ridersData, error: ridersError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds)
        .order("created_at", { ascending: false });

      if (ridersError) throw ridersError;

      setRiders(ridersData || []);
    } catch (error) {
      console.error("Erro ao buscar motoboys:", error);
      toast.error("Erro ao carregar lista de motoboys");
    } finally {
      setLoading(false);
    }
  };

  const deleteRider = async (riderId: string) => {
    if (!confirm("Tem certeza que deseja remover este motoboy?")) {
      return;
    }

    try {
      // Remover role de delivery_rider
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", riderId)
        .eq("role", "delivery_rider");

      if (roleError) throw roleError;

      // Resetar campos de delivery no perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          delivery_approved: false, 
          delivery_active: false 
        })
        .eq("id", riderId);

      if (profileError) throw profileError;

      toast.success("Motoboy removido com sucesso");
      fetchRiders();
    } catch (error) {
      console.error("Erro ao remover motoboy:", error);
      toast.error("Erro ao remover motoboy");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const toggleRiderStatus = async (riderId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ delivery_active: !currentStatus })
        .eq("id", riderId);

      if (error) throw error;

      toast.success(`Motoboy ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      fetchRiders();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status do motoboy");
    }
  };

  const onSubmit = async (values: z.infer<typeof createRiderSchema>) => {
    try {
      setCreating(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      const response = await supabase.functions.invoke('create-delivery-rider', {
        body: {
          name: values.name,
          phone: values.phone,
          email: values.email,
          password: values.password,
        },
      });

      console.log("Response:", response);

      if (response.error) {
        console.error("Function invocation error:", response.error);
        
        if (response.data?.error) {
          if (response.data.code === 'EMAIL_EXISTS') {
            toast.error("Este email já está cadastrado. Use outro email.");
          } else {
            toast.error(response.data.error);
          }
        } else {
          toast.error("Erro ao conectar com o servidor");
        }
        return;
      }

      const data = response.data;
      
      if (data?.error) {
        console.error("Erro retornado:", data.error);
        
        if (data.code === 'EMAIL_EXISTS') {
          toast.error("Este email já está cadastrado. Use outro email.");
        } else {
          toast.error(data.error || "Erro ao criar motoboy");
        }
        return;
      }

      if (!data?.success) {
        toast.error("Erro ao criar motoboy");
        return;
      }

      toast.success("Motoboy criado com sucesso!");
      setDialogOpen(false);
      form.reset();
      fetchRiders();
    } catch (error: any) {
      console.error("Erro ao criar motoboy:", error);
      toast.error("Erro inesperado ao criar motoboy");
    } finally {
      setCreating(false);
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
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Motoboy
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Motoboy</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="João Silva" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(11) 99999-9999" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="joao@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={creating}>
                          {creating ? "Criando..." : "Criar Motoboy"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => navigate('/admin')}>
                Voltar
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                Sair
              </Button>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Lista de Motoboys</h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                          <Badge variant={rider.delivery_active ? "default" : "secondary"}>
                            {rider.delivery_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={rider.delivery_active}
                            onCheckedChange={() => toggleRiderStatus(rider.id, rider.delivery_active)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => deleteRider(rider.id)}
                          >
                            Remover
                          </Button>
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