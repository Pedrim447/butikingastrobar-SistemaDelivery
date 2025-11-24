import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/hooks/useGuestMode';
import { GuestModePrompt } from '@/components/GuestModePrompt';
import { useState, useEffect } from 'react';

const Cart = () => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    updateNotes,
    getCartTotal,
    getCartItemsCount,
  } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { guestToken, loading: guestLoading } = useGuestMode();
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);

  const subtotal = getCartTotal();
  const deliveryFee = 5.0;
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    // Verifica se tem usuário autenticado OU dados de convidado
    if (!user && !guestToken) {
      // Se não tiver nenhum dos dois, mostra o prompt para coletar dados
      setShowGuestPrompt(true);
      return;
    }
    // Se tiver dados, pode ir para checkout
    navigate('/checkout');
  };

  const handleGuestPromptSuccess = () => {
    setShowGuestPrompt(false);
    // Após coletar dados, vai para checkout
    navigate('/checkout');
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <ShoppingBag className="w-24 h-24 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Seu carrinho está vazio</h2>
        <p className="text-muted-foreground mb-6">Adicione produtos para continuar</p>
        <Button onClick={() => navigate('/')} size="lg">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Ver Cardápio
        </Button>
      </div>
    );
  }

  return (
    <>
      <GuestModePrompt 
        open={showGuestPrompt} 
        onClose={() => setShowGuestPrompt(false)}
        onSuccess={handleGuestPromptSuccess}
      />
      
      <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Meu Carrinho</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-4 mb-6">
          {cart.map(item => (
            <Card key={item.product.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        Sem imagem
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold">{item.product.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          R$ {item.product.price.toFixed(2)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-12 text-center font-semibold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>

                    <Textarea
                      placeholder="Observações (ex: sem cebola)"
                      value={item.notes || ''}
                      onChange={(e) => updateNotes(item.product.id, e.target.value)}
                      className="text-sm h-20 resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal ({getCartItemsCount()} itens)</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Taxa de entrega</span>
              <span>R$ {deliveryFee.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
            </div>
            <Button
              size="lg"
              className="w-full mt-4"
              onClick={handleCheckout}
            >
              Finalizar Pedido
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default Cart;
