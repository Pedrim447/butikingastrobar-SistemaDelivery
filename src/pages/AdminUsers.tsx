import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordConfirmDialog } from "@/components/PasswordConfirmDialog";
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
import { Shield, Bike, User, Store } from "lucide-react";

interface UserWithRole {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'delivery_rider' | 'pdv';
  created_at: string;
  name?: string;
  phone?: string;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, checkingRole, signOut } = useAuth();
  const [passwordConfirmed, setPasswordConfirmed] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // Aguarda o carregamento completo da autenticação E verificação de role
    if (authLoading || checkingRole) return;
    
    if (!user) {
      navigate("/auth", { replace: true });
    } else if (!isAdmin) {
      navigate("/", { replace: true });
    } else if (!passwordConfirmed) {
      setShowPasswordDialog(true);
    }
  }, [user, isAdmin, authLoading, checkingRole, navigate, passwordConfirmed]);

  useEffect(() => {
    if (isAdmin && passwordConfirmed) {
      fetchUsers();
    }
  }, [isAdmin, passwordConfirmed]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Chamar edge function para listar usuários
      const { data, error } = await supabase.functions.invoke('list-users');

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      const usersWithRoles = data?.users || [];

      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter((user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const handleOpenDialog = (userItem: UserWithRole) => {
    setSelectedUser(userItem);
    setNewRole(userItem.role);
    setUserName(userItem.name || "");
    setUserPhone(userItem.phone || "");
    setDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !newRole) {
      toast.error("Selecione uma função");
      return;
    }

    if (!userName || !userPhone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    try {
      // Atualizar role se mudou
      if (selectedUser.role !== newRole) {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", selectedUser.id);

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: selectedUser.id,
            role: newRole as 'user' | 'admin' | 'delivery_rider',
          });

        if (roleError) throw roleError;
      }

      // Atualizar perfil (nome e telefone para todos)
      const profileUpdate: any = {
        name: userName,
        phone: userPhone,
      };

      // Se for delivery_rider, marcar como aprovado e ativo
      if (newRole === 'delivery_rider') {
        profileUpdate.delivery_approved = true;
        profileUpdate.delivery_active = true;
      } else {
        profileUpdate.delivery_approved = false;
        profileUpdate.delivery_active = false;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", selectedUser.id);

      if (profileError) throw profileError;

      toast.success("Usuário atualizado com sucesso!");
      setDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Erro ao atualizar usuário");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'delivery_rider':
        return <Bike className="h-4 w-4" />;
      case 'pdv':
        return <Store className="h-4 w-4" />;
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
      case 'pdv':
        return 'PDV';
      default:
        return 'Usuário';
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
      <div className="flex h-screen items-center justify-center">
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
        description="Informe a senha de acesso para gerenciar usuários"
      />
    );
  }

  // Loading dos dados dos usuários
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background w-full">
        <AdminSidebar onSignOut={signOut} />
        <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/admin')}>
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

          <div className="mb-4">
            <Input
              type="text"
              placeholder="Pesquisar por email ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="bg-card rounded-lg shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((userItem) => (
                  <TableRow key={userItem.id}>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell>{userItem.name || "-"}</TableCell>
                    <TableCell>{userItem.phone || "-"}</TableCell>
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
                            Editar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Usuário</DialogTitle>
                            <DialogDescription>
                              Edite as informações do usuário {userItem.email}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label htmlFor="user-name">Nome</Label>
                              <Input
                                id="user-name"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Nome completo"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="user-phone">Telefone</Label>
                              <Input
                                id="user-phone"
                                value={userPhone}
                                onChange={(e) => setUserPhone(e.target.value)}
                                placeholder="(00) 00000-0000"
                              />
                            </div>
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

                            <Button onClick={handleUpdateUser} className="w-full">
                              Salvar Alterações
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
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
};

export default AdminUsers;