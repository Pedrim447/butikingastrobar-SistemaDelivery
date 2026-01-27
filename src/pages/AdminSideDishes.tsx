import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";

interface SideDish {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  display_order: number;
  show_as_product: boolean;
}

export default function AdminSideDishes() {
  const navigate = useNavigate();
  const { user, isAdmin, signOut, loading: authLoading, checkingRole } = useAuth();
  const [sideDishes, setSideDishes] = useState<SideDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSideDish, setEditingSideDish] = useState<SideDish | null>(null);

  const [form, setForm] = useState({
    name: "",
    price: "",
    display_order: "",
    is_available: true,
    show_as_product: false,
  });

  useEffect(() => {
    if (authLoading || checkingRole) return;

    if (!user || !isAdmin) {
      navigate("/", { replace: true });
      return;
    }

    fetchSideDishes();
  }, [user, isAdmin, navigate, authLoading, checkingRole]);

  const fetchSideDishes = async () => {
    const { data, error } = await supabase
      .from("side_dishes")
      .select("*")
      .order("display_order");

    if (error) {
      toast.error("Erro ao carregar acompanhamentos");
      console.error(error);
      setLoading(false);
      return;
    }

    setSideDishes(data as SideDish[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sideDishData = {
      name: form.name,
      price: parseFloat(form.price) || 0,
      display_order: parseInt(form.display_order) || 0,
      is_available: form.is_available,
      show_as_product: form.show_as_product,
    };

    if (editingSideDish) {
      const { error } = await supabase
        .from("side_dishes")
        .update(sideDishData)
        .eq("id", editingSideDish.id);

      if (error) {
        toast.error("Erro ao atualizar acompanhamento");
        console.error(error);
        return;
      }

      toast.success("Acompanhamento atualizado com sucesso!");
    } else {
      const { error } = await supabase
        .from("side_dishes")
        .insert(sideDishData);

      if (error) {
        toast.error("Erro ao criar acompanhamento");
        console.error(error);
        return;
      }

      toast.success("Acompanhamento criado com sucesso!");
    }

    setDialogOpen(false);
    fetchSideDishes();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este acompanhamento?")) return;

    const { error } = await supabase
      .from("side_dishes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir acompanhamento");
      console.error(error);
      return;
    }

    toast.success("Acompanhamento excluído com sucesso!");
    fetchSideDishes();
  };

  const handleEdit = (sideDish: SideDish) => {
    setEditingSideDish(sideDish);
    setForm({
      name: sideDish.name,
      price: sideDish.price.toString(),
      display_order: sideDish.display_order.toString(),
      is_available: sideDish.is_available,
      show_as_product: sideDish.show_as_product,
    });
    setDialogOpen(true);
  };

  const handleToggleAvailable = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("side_dishes")
      .update({ is_available: !currentValue })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar disponibilidade");
      console.error(error);
      return;
    }

    fetchSideDishes();
  };

  const handleToggleShowAsProduct = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("side_dishes")
      .update({ show_as_product: !currentValue })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar exibição como produto");
      console.error(error);
      return;
    }

    fetchSideDishes();
  };

  const resetForm = () => {
    setEditingSideDish(null);
    setForm({
      name: "",
      price: "",
      display_order: "",
      is_available: true,
      show_as_product: false,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || loading || checkingRole) {
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

        <main className="flex-1 p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Gerenciar Acompanhamentos</h1>
            <p className="text-muted-foreground">
              Adicione, edite ou remova acompanhamentos do cardápio
            </p>
          </div>

          <div className="flex justify-end mb-4">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Acompanhamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSideDish ? "Editar Acompanhamento" : "Novo Acompanhamento"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Preço (R$)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        placeholder="0 = Grátis"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="order">Ordem de Exibição</Label>
                      <Input
                        id="order"
                        type="number"
                        min="0"
                        value={form.display_order}
                        onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="available"
                      checked={form.is_available}
                      onCheckedChange={(checked) => setForm({ ...form, is_available: checked })}
                    />
                    <Label htmlFor="available">Disponível</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show_as_product"
                      checked={form.show_as_product}
                      onCheckedChange={(checked) => setForm({ ...form, show_as_product: checked })}
                    />
                    <Label htmlFor="show_as_product">Mostrar como Produto</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      {editingSideDish ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Disponível</TableHead>
                  <TableHead>Mostrar como Produto</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sideDishes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum acompanhamento cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  sideDishes.map((sideDish) => (
                    <TableRow key={sideDish.id}>
                      <TableCell className="font-medium">{sideDish.name}</TableCell>
                      <TableCell>
                        {sideDish.price > 0
                          ? `R$ ${sideDish.price.toFixed(2)}`
                          : "Grátis"}
                      </TableCell>
                      <TableCell>{sideDish.display_order}</TableCell>
                      <TableCell>
                        <Switch
                          checked={sideDish.is_available}
                          onCheckedChange={() =>
                            handleToggleAvailable(sideDish.id, sideDish.is_available)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={sideDish.show_as_product}
                          onCheckedChange={() =>
                            handleToggleShowAsProduct(sideDish.id, sideDish.show_as_product)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(sideDish)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(sideDish.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
