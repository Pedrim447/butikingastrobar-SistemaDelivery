import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { Product, Category } from "@/types";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminProducts() {
  const navigate = useNavigate();
  const { user, isAdmin, signOut, loading: authLoading, checkingRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    is_available: true,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    display_order: "",
  });

  useEffect(() => {
    if (authLoading || checkingRole) return;

    if (!user || !isAdmin) {
      navigate("/", { replace: true });
      return;
    }

    fetchData();
  }, [user, isAdmin, navigate, authLoading, checkingRole]);

  const fetchData = async () => {
    await Promise.all([fetchProducts(), fetchCategories()]);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar produtos");
      console.error(error);
      return;
    }

    setProducts(data as Product[]);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("display_order");

    if (error) {
      toast.error("Erro ao carregar categorias");
      console.error(error);
      return;
    }

    setCategories(data as Category[]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao fazer upload da imagem');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let imageUrl = editingProduct?.image_url || null;
    
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }

    const productData = {
      name: productForm.name,
      description: productForm.description || null,
      price: parseFloat(productForm.price),
      category_id: productForm.category_id,
      is_available: productForm.is_available,
      image_url: imageUrl,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast.error("Erro ao atualizar produto");
        console.error(error);
        return;
      }

      toast.success("Produto atualizado com sucesso!");
    } else {
      const { error } = await supabase
        .from("products")
        .insert(productData);

      if (error) {
        toast.error("Erro ao criar produto");
        console.error(error);
        return;
      }

      toast.success("Produto criado com sucesso!");
    }

    setProductDialogOpen(false);
    fetchProducts();
    resetProductForm();
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoryData = {
      name: categoryForm.name,
      slug: categoryForm.slug,
      display_order: parseInt(categoryForm.display_order) || 0,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", editingCategory.id);

      if (error) {
        toast.error("Erro ao atualizar categoria");
        console.error(error);
        return;
      }

      toast.success("Categoria atualizada com sucesso!");
    } else {
      const { error } = await supabase
        .from("categories")
        .insert(categoryData);

      if (error) {
        toast.error("Erro ao criar categoria");
        console.error(error);
        return;
      }

      toast.success("Categoria criada com sucesso!");
    }

    setCategoryDialogOpen(false);
    fetchCategories();
    resetCategoryForm();
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir produto");
      console.error(error);
      return;
    }

    toast.success("Produto excluído com sucesso!");
    fetchProducts();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir categoria");
      console.error(error);
      return;
    }

    toast.success("Categoria excluída com sucesso!");
    fetchCategories();
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      category_id: product.category_id,
      is_available: product.is_available,
    });
    setImagePreview(product.image_url);
    setProductDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      display_order: category.display_order.toString(),
    });
    setCategoryDialogOpen(true);
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      description: "",
      price: "",
      category_id: "",
      is_available: true,
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: "",
      slug: "",
      display_order: "",
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
            <h1 className="text-3xl font-bold">Gerenciar Cardápio</h1>
            <p className="text-muted-foreground">Gerencie produtos e categorias do seu cardápio</p>
          </div>

          <Tabs defaultValue="products" className="space-y-4">
            <TabsList>
              <TabsTrigger value="products">Produtos</TabsTrigger>
              <TabsTrigger value="categories">Categorias</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetProductForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Produto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProduct ? "Editar Produto" : "Novo Produto"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleProductSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome do Produto *</Label>
                        <Input
                          id="name"
                          value={productForm.name}
                          onChange={(e) =>
                            setProductForm({ ...productForm, name: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={productForm.description}
                          onChange={(e) =>
                            setProductForm({ ...productForm, description: e.target.value })
                          }
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price">Preço (R$) *</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={productForm.price}
                            onChange={(e) =>
                              setProductForm({ ...productForm, price: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">Categoria *</Label>
                          <Select
                            value={productForm.category_id}
                            onValueChange={(value) =>
                              setProductForm({ ...productForm, category_id: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Imagem do Produto</Label>
                        <div className="flex items-center gap-4">
                          {imagePreview && (
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <Label htmlFor="image" className="cursor-pointer">
                              <div className="border-2 border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors">
                                <div className="flex flex-col items-center gap-2">
                                  <Upload className="w-8 h-8 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">
                                    Clique para fazer upload
                                  </span>
                                </div>
                              </div>
                            </Label>
                            <Input
                              id="image"
                              type="file"
                              accept="image/*"
                              onChange={handleImageSelect}
                              className="hidden"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="available"
                          checked={productForm.is_available}
                          onCheckedChange={(checked) =>
                            setProductForm({ ...productForm, is_available: checked })
                          }
                        />
                        <Label htmlFor="available">Produto disponível</Label>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setProductDialogOpen(false);
                            resetProductForm();
                          }}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" className="flex-1" disabled={uploadingImage}>
                          {uploadingImage ? "Enviando..." : editingProduct ? "Atualizar" : "Criar"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="bg-card rounded-lg shadow">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imagem</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Disponível</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum produto cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product) => {
                        const category = categories.find(c => c.id === product.category_id);
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{category?.name || "-"}</TableCell>
                            <TableCell>R$ {product.price.toFixed(2)}</TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  product.is_available
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {product.is_available ? "Sim" : "Não"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteProduct(product.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetCategoryForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Categoria
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cat-name">Nome da Categoria *</Label>
                        <Input
                          id="cat-name"
                          value={categoryForm.name}
                          onChange={(e) =>
                            setCategoryForm({ ...categoryForm, name: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="slug">Slug *</Label>
                        <Input
                          id="slug"
                          value={categoryForm.slug}
                          onChange={(e) =>
                            setCategoryForm({ ...categoryForm, slug: e.target.value })
                          }
                          placeholder="ex: bebidas"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="order">Ordem de Exibição</Label>
                        <Input
                          id="order"
                          type="number"
                          value={categoryForm.display_order}
                          onChange={(e) =>
                            setCategoryForm({ ...categoryForm, display_order: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setCategoryDialogOpen(false);
                            resetCategoryForm();
                          }}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" className="flex-1">
                          {editingCategory ? "Atualizar" : "Criar"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="bg-card rounded-lg shadow">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Ordem</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhuma categoria cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.slug}</TableCell>
                          <TableCell>{category.display_order}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditCategory(category)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteCategory(category.id)}
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
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </SidebarProvider>
  );
}
