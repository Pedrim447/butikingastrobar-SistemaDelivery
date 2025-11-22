import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Bike, User } from "lucide-react";

interface UserWithRole {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'delivery_rider';
  created_at: string;
  rider_name?: string;
  rider_phone?: string;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Buscar todos os usuários autenticados
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      // Buscar roles dos usuários
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Buscar dados dos delivery riders
      const { data: riders, error: ridersError } = await supabase
        .from("delivery_riders")
        .select("user_id, name, phone");

      if (ridersError) throw ridersError;

      // Combinar dados
      const usersWithRoles: UserWithRole[] = authUsers.users.map((authUser) => {
        const userRole = roles?.find((r) => r.user_id === authUser.id);
        const riderData = riders?.find((r) => r.user_id === authUser.id);

        return {
          id: authUser.id,
          email: authUser.email || "",
          role: userRole?.role || 'user',
          created_at: authUser.created_at,
          rider_name: riderData?.name,
          rider_phone: riderData?.phone,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (userItem: UserWithRole) => {
    setSelectedUser(userItem);
    setNewRole(userItem.role);
    setRiderName(userItem.rider_name || "");
    setRiderPhone(userItem.rider_phone || "");
    setDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) {
      toast.error("Selecione uma função");
      return;
    }

    if (newRole === 'delivery_rider' && (!riderName || !riderPhone)) {
      toast.error("Nome e telefone são obrigatórios para entregadores");
      return;
    }

    try {
      // Deletar role anterior
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUser.id);

      // Inserir nova role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: selectedUser.id,
          role: newRole as 'user' | 'admin' | 'delivery_rider',
        });

      if (roleError) throw roleError;

      // Se for delivery_rider, criar/atualizar perfil de entregador
      if (newRole === 'delivery_rider') {
        const { error: riderError } = await supabase
          .from("delivery_riders")
          .upsert({
            user_id: selectedUser.id,
            name: riderName,
            phone: riderPhone,
            approved: true,
            is_active: true,
          }, {
            onConflict: 'user_id'
          });

        if (riderError) throw riderError;
      } else {
        // Se não for mais delivery_rider, remover da tabela delivery_riders
        const { error: deleteRiderError } = await supabase
          .from("delivery_riders")
          .delete()
          .eq("user_id", selectedUser.id);

        if (deleteRiderError && deleteRiderError.code !== 'PGRST116') {
          console.error("Error deleting rider:", deleteRiderError);
        }
      }

      toast.success("Função atualizada com sucesso!");
      setDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Erro ao atualizar função");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'delivery_rider':
        return <Bike className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'delivery_rider':
        return 'Entregador';
      default:
        return 'Usuário';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar onSignOut={signOut} />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Gerenciar Usuários</h1>

          <div className="bg-card rounded-lg shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userItem) => (
                  <TableRow key={userItem.id}>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(userItem.role)}
                        {getRoleLabel(userItem.role)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(userItem.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Dialog open={dialogOpen && selectedUser?.id === userItem.id} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(userItem)}
                          >
                            Editar Função
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Atualizar Função do Usuário</DialogTitle>
                            <DialogDescription>
                              Altere a função do usuário {userItem.email}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label>Função</Label>
                              <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma função" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">Usuário</SelectItem>
                                  <SelectItem value="delivery_rider">Entregador</SelectItem>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {newRole === 'delivery_rider' && (
                              <>
                                <div className="space-y-2">
                                  <Label htmlFor="rider-name">Nome do Entregador</Label>
                                  <Input
                                    id="rider-name"
                                    value={riderName}
                                    onChange={(e) => setRiderName(e.target.value)}
                                    placeholder="Nome completo"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="rider-phone">Telefone</Label>
                                  <Input
                                    id="rider-phone"
                                    value={riderPhone}
                                    onChange={(e) => setRiderPhone(e.target.value)}
                                    placeholder="(00) 00000-0000"
                                  />
                                </div>
                              </>
                            )}

                            <Button onClick={handleUpdateRole} className="w-full">
                              Atualizar
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminUsers;
