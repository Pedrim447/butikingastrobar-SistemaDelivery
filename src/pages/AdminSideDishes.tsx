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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
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
  has_variations: boolean;
}

interface Variation {
  id: string;
  side_dish_id: string;
  name: string;
  display_order: number;
  is_available: boolean;
}

export default function AdminSideDishes() {
  const navigate = useNavigate();
  const { user, isAdmin, signOut, loading: authLoading, checkingRole } = useAuth();
  const [sideDishes, setSideDishes] = useState<SideDish[]>([]);
  const [variations, setVariations] = useState<Record<string, Variation[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [variationDialogOpen, setVariationDialogOpen] = useState(false);
  const [editingSideDish, setEditingSideDish] = useState<SideDish | null>(null);
  const [editingVariation, setEditingVariation] = useState<Variation | null>(null);
  const [currentSideDishId, setCurrentSideDishId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    price: "",
    display_order: "",
    is_available: true,
    show_as_product: false,
    has_variations: false,
  });

  const [variationForm, setVariationForm] = useState({
    name: "",
    display_order: "",
    is_available: true,
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
    
    // Fetch all variations
    const { data: variationsData, error: variationsError } = await supabase
      .from("side_dish_variations")
      .select("*")
      .order("display_order");

    if (!variationsError && variationsData) {
      const grouped = variationsData.reduce((acc, v) => {
        if (!acc[v.side_dish_id]) acc[v.side_dish_id] = [];
        acc[v.side_dish_id].push(v);
        return acc;
      }, {} as Record<string, Variation[]>);
      setVariations(grouped);
    }

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
      has_variations: form.has_variations,
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

  const handleVariationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentSideDishId) return;

    const variationData = {
      side_dish_id: currentSideDishId,
      name: variationForm.name,
      display_order: parseInt(variationForm.display_order) || 0,
      is_available: variationForm.is_available,
    };

    if (editingVariation) {
      const { error } = await supabase
        .from("side_dish_variations")
        .update(variationData)
        .eq("id", editingVariation.id);

      if (error) {
        toast.error("Erro ao atualizar variação");
        console.error(error);
        return;
      }

      toast.success("Variação atualizada com sucesso!");
    } else {
      const { error } = await supabase
        .from("side_dish_variations")
        .insert(variationData);

      if (error) {
        toast.error("Erro ao criar variação");
        console.error(error);
        return;
      }

      toast.success("Variação criada com sucesso!");
    }

    setVariationDialogOpen(false);
    fetchSideDishes();
    resetVariationForm();
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

  const handleDeleteVariation = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta variação?")) return;

    const { error } = await supabase
      .from("side_dish_variations")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir variação");
      console.error(error);
      return;
    }

    toast.success("Variação excluída com sucesso!");
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
      has_variations: sideDish.has_variations,
    });
    setDialogOpen(true);
  };

  const handleEditVariation = (variation: Variation, sideDishId: string) => {
    setEditingVariation(variation);
    setCurrentSideDishId(sideDishId);
    setVariationForm({
      name: variation.name,
      display_order: variation.display_order.toString(),
      is_available: variation.is_available,
    });
    setVariationDialogOpen(true);
  };

  const handleAddVariation = (sideDishId: string) => {
    setCurrentSideDishId(sideDishId);
    resetVariationForm();
    setVariationDialogOpen(true);
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

  const handleToggleHasVariations = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("side_dishes")
      .update({ has_variations: !currentValue })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar configuração de variações");
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
      has_variations: false,
    });
  };

  const resetVariationForm = () => {
    setEditingVariation(null);
    setVariationForm({
      name: "",
      display_order: "",
      is_available: true,
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
              Adicione, edite ou remova acompanhamentos e suas variações
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

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_variations"
                      checked={form.has_variations}
                      onCheckedChange={(checked) => setForm({ ...form, has_variations: checked })}
                    />
                    <Label htmlFor="has_variations">Possui Variações (tipos)</Label>
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

          {/* Variation Dialog */}
          <Dialog open={variationDialogOpen} onOpenChange={setVariationDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingVariation ? "Editar Variação" : "Nova Variação"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleVariationSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="variation-name">Nome da Variação *</Label>
                  <Input
                    id="variation-name"
                    value={variationForm.name}
                    onChange={(e) => setVariationForm({ ...variationForm, name: e.target.value })}
                    placeholder="Ex: Branco, Integral, À Grega..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="variation-order">Ordem de Exibição</Label>
                  <Input
                    id="variation-order"
                    type="number"
                    min="0"
                    value={variationForm.display_order}
                    onChange={(e) => setVariationForm({ ...variationForm, display_order: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="variation-available"
                    checked={variationForm.is_available}
                    onCheckedChange={(checked) => setVariationForm({ ...variationForm, is_available: checked })}
                  />
                  <Label htmlFor="variation-available">Disponível</Label>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setVariationDialogOpen(false);
                      resetVariationForm();
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingVariation ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Accordion type="single" collapsible className="space-y-2">
            {sideDishes.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border rounded-lg">
                Nenhum acompanhamento cadastrado
              </div>
            ) : (
              sideDishes.map((sideDish) => (
                <AccordionItem key={sideDish.id} value={sideDish.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 flex-1 mr-4">
                      <span className="font-medium">{sideDish.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {sideDish.price > 0 ? `R$ ${sideDish.price.toFixed(2)}` : "Grátis"}
                      </span>
                      {sideDish.has_variations && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {variations[sideDish.id]?.length || 0} variações
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="py-4 space-y-4">
                      {/* Controls Row */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={sideDish.is_available}
                            onCheckedChange={() => handleToggleAvailable(sideDish.id, sideDish.is_available)}
                          />
                          <Label className="text-sm">Disponível</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={sideDish.show_as_product}
                            onCheckedChange={() => handleToggleShowAsProduct(sideDish.id, sideDish.show_as_product)}
                          />
                          <Label className="text-sm">Mostrar como Produto</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={sideDish.has_variations}
                            onCheckedChange={() => handleToggleHasVariations(sideDish.id, sideDish.has_variations)}
                          />
                          <Label className="text-sm">Possui Variações</Label>
                        </div>
                        <div className="flex-1" />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(sideDish)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(sideDish.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Variations Section */}
                      {sideDish.has_variations && (
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm">Variações / Tipos</h4>
                            <Button size="sm" variant="outline" onClick={() => handleAddVariation(sideDish.id)}>
                              <Plus className="w-4 h-4 mr-1" />
                              Adicionar
                            </Button>
                          </div>

                          {variations[sideDish.id]?.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Ordem</TableHead>
                                  <TableHead>Disponível</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {variations[sideDish.id].map((variation) => (
                                  <TableRow key={variation.id}>
                                    <TableCell>{variation.name}</TableCell>
                                    <TableCell>{variation.display_order}</TableCell>
                                    <TableCell>
                                      <span className={variation.is_available ? "text-green-600" : "text-muted-foreground"}>
                                        {variation.is_available ? "Sim" : "Não"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEditVariation(variation, sideDish.id)}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleDeleteVariation(variation.id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Nenhuma variação cadastrada. Adicione tipos como "Branco", "Integral", etc.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))
            )}
          </Accordion>
        </main>
      </div>
    </SidebarProvider>
  );
}
