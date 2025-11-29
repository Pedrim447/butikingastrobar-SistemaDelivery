import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Printer, ShoppingCart, Trash2, LogOut } from "lucide-react";
import { Product } from "@/types";

interface CartItem {
  product: Product;
  quantity: number;
}

interface SelfServiceItem {
  peso_kg: number;
  preco_kg: number;
  total: number;
}

export default function PDV() {
  const navigate = useNavigate();
  const { user, isPDV, loading, signOut } = useAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selfService, setSelfService] = useState<SelfServiceItem | null>(null);
  
  const [pesoKg, setPesoKg] = useState("");
  const [precoKg, setPrecoKg] = useState("");
  const [comandaManual, setComandaManual] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isPDV)) {
      navigate("/auth");
    }
  }, [user, isPDV, loading, navigate]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .order("name");

    if (error) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProducts(data || []);
    }
  };

  const addSelfService = () => {
    const peso = parseFloat(pesoKg);
    const preco = parseFloat(precoKg);

    if (isNaN(peso) || peso <= 0) {
      toast({
        title: "Peso inválido",
        description: "Digite um peso válido em kg",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(preco) || preco <= 0) {
      toast({
        title: "Preço inválido",
        description: "Digite um preço válido por kg",
        variant: "destructive",
      });
      return;
    }

    const total = peso * preco;
    setSelfService({ peso_kg: peso, preco_kg: preco, total });
    setPesoKg("");
    setPrecoKg("");
    
    toast({
      title: "Self-service adicionado",
      description: `${peso.toFixed(3)}kg × R$ ${preco.toFixed(2)} = R$ ${total.toFixed(2)}`,
    });
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const calculateTotal = () => {
    const productsTotal = cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const selfServiceTotal = selfService?.total || 0;
    return productsTotal + selfServiceTotal;
  };

  const clearAll = () => {
    setCart([]);
    setSelfService(null);
    setComandaManual("");
  };

  const finalizeSale = async () => {
    if (!selfService && cart.length === 0) {
      toast({
        title: "Venda vazia",
        description: "Adicione itens antes de finalizar",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Gerar número da comanda
      const { data: comandaData, error: comandaError } = await supabase.rpc(
        "generate_comanda_number"
      );

      if (comandaError) throw comandaError;

      const comandaId = comandaManual || comandaData;
      const total = calculateTotal();

      // Criar pedido PDV
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: "PDV",
          customer_phone: "0000000000",
          customer_address: "Balcão",
          customer_cep: "00000000",
          subtotal: total,
          total: total,
          delivery_fee: 0,
          status: "delivered",
          tipo_pedido: "pdv",
          peso_kg: selfService?.peso_kg,
          preco_kg: selfService?.preco_kg,
          valor_prato: selfService?.total,
          comanda_id: comandaId,
          payment_method: "dinheiro",
          payment_status: "paid",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Adicionar items do carrinho
      if (cart.length > 0) {
        const orderItems = cart.map((item) => ({
          order_id: orderData.id,
          product_id: item.product.id,
          product_name: item.product.name,
          product_price: item.product.price,
          quantity: item.quantity,
          subtotal: item.product.price * item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Venda finalizada!",
        description: `Comanda: ${comandaId}`,
      });

      // Imprimir comanda
      printComanda(orderData, comandaId);

      // Limpar tudo
      clearAll();
    } catch (error: any) {
      toast({
        title: "Erro ao finalizar venda",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const printComanda = (order: any, comandaId: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comanda ${comandaId}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              max-width: 300px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              text-align: center;
              font-size: 20px;
              margin-bottom: 10px;
            }
            .info {
              margin: 10px 0;
              font-size: 14px;
            }
            .items {
              margin: 20px 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 13px;
            }
            .separator {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .total {
              font-size: 16px;
              font-weight: bold;
              text-align: right;
              margin-top: 10px;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <h1>COMANDA</h1>
          <div class="info">
            <div><strong>Nº:</strong> ${comandaId}</div>
            <div><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</div>
          </div>
          
          <div class="separator"></div>
          
          <div class="items">
            ${
              selfService
                ? `
              <div class="item">
                <span>Self-service (${selfService.peso_kg.toFixed(3)}kg × R$ ${selfService.preco_kg.toFixed(2)})</span>
                <span>R$ ${selfService.total.toFixed(2)}</span>
              </div>
            `
                : ""
            }
            ${cart
              .map(
                (item) => `
              <div class="item">
                <span>${item.quantity}x ${item.product.name}</span>
                <span>R$ ${(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            `
              )
              .join("")}
          </div>
          
          <div class="separator"></div>
          
          <div class="total">
            TOTAL: R$ ${calculateTotal().toFixed(2)}
          </div>
          
          <div class="separator"></div>
          
          <p style="text-align: center; margin-top: 20px; font-size: 12px;">
            Obrigado pela preferência!
          </p>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">PDV - Caixa</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Self-Service */}
          <Card>
            <CardHeader>
              <CardTitle>Self-Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="peso">Peso (kg)</Label>
                <Input
                  id="peso"
                  type="number"
                  step="0.001"
                  placeholder="0.450"
                  value={pesoKg}
                  onChange={(e) => setPesoKg(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="preco">Preço por kg (R$)</Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  placeholder="59.90"
                  value={precoKg}
                  onChange={(e) => setPrecoKg(e.target.value)}
                />
              </div>
              <Button onClick={addSelfService} className="w-full">
                Adicionar Self-Service
              </Button>

              {selfService && (
                <div className="mt-4 p-4 bg-accent rounded-lg">
                  <p className="text-sm">
                    <strong>Peso:</strong> {selfService.peso_kg.toFixed(3)}kg
                  </p>
                  <p className="text-sm">
                    <strong>Preço/kg:</strong> R$ {selfService.preco_kg.toFixed(2)}
                  </p>
                  <p className="text-lg font-bold mt-2">
                    Total: R$ {selfService.total.toFixed(2)}
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setSelfService(null)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Produtos */}
          <Card>
            <CardHeader>
              <CardTitle>Produtos Avulsos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => addToCart(product)}
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {product.price.toFixed(2)}
                      </p>
                    </div>
                    <Plus className="h-5 w-5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Resumo da Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="comanda">Nº Comanda (opcional)</Label>
                <Input
                  id="comanda"
                  placeholder="Automático"
                  value={comandaManual}
                  onChange={(e) => setComandaManual(e.target.value)}
                />
              </div>

              <Separator />

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selfService && (
                  <div className="p-2 bg-accent rounded">
                    <p className="text-sm font-medium">Self-Service</p>
                    <p className="text-xs text-muted-foreground">
                      {selfService.peso_kg.toFixed(3)}kg × R${" "}
                      {selfService.preco_kg.toFixed(2)}
                    </p>
                    <p className="text-sm font-bold">
                      R$ {selfService.total.toFixed(2)}
                    </p>
                  </div>
                )}

                {cart.map((item) => (
                  <div key={item.product.id} className="p-2 bg-accent rounded">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {item.product.price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-bold w-6 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm font-bold mt-1">
                      R$ {(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="text-2xl font-bold text-right">
                TOTAL: R$ {calculateTotal().toFixed(2)}
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={finalizeSale}
                  disabled={isProcessing || (!selfService && cart.length === 0)}
                >
                  <Printer className="mr-2 h-5 w-5" />
                  {isProcessing ? "Processando..." : "Finalizar e Imprimir"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearAll}
                  disabled={isProcessing}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Tudo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
