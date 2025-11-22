import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useGuestMode } from '@/hooks/useGuestMode';
import { GuestModePrompt } from '@/components/GuestModePrompt';
import { useAuth } from '@/contexts/AuthContext';

const checkoutSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  phone: z.string().min(10, 'Telefone inválido').max(15),
  cep: z.string().length(8, 'CEP deve ter 8 dígitos').regex(/^\d+$/, 'CEP deve conter apenas números'),
  address: z.string().min(5, 'Endereço obrigatório').max(200),
  number: z.string().min(1, 'Número obrigatório').max(10),
  reference: z.string().max(200).optional(),
  neighborhood: z.string().min(3, 'Bairro obrigatório').max(100),
  notes: z.string().max(500).optional(),
});

const Checkout = () => {
  const { cart, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { guestToken, guestData, updateGuestCustomer, loading: guestLoading } = useGuestMode();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cep: '',
    address: '',
    number: '',
    reference: '',
    neighborhood: '',
    notes: '',
  });

  // Store city and state internally (from CEP)
  const [addressData, setAddressData] = useState({
    city: '',
    state: '',
  });

  // Check if user needs to provide guest data
  useEffect(() => {
    if (!guestLoading && !user && !guestToken) {
      setShowGuestPrompt(true);
    }
  }, [guestLoading, user, guestToken]);

  // Load user profile data on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setFormData(prev => ({
            ...prev,
            name: data.name,
            phone: data.phone,
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar perfil:', error);
      }
    };

    if (user) {
      loadUserProfile();
    }
  }, [user]);

  // Load guest data on mount
  useEffect(() => {
    if (guestData) {
      setFormData(prev => ({
        ...prev,
        name: guestData.name,
        phone: guestData.phone,
        cep: guestData.address.cep,
        address: guestData.address.street,
        number: guestData.address.number || '',
        reference: guestData.address.complement || '',
        neighborhood: guestData.address.neighborhood,
      }));
      
      setAddressData({
        city: guestData.address.city,
        state: guestData.address.state,
      });
    }
  }, [guestData]);

  const subtotal = getCartTotal();
  const deliveryFee = 5.0;
  const total = subtotal + deliveryFee;

  const fetchAddressByCep = async (cep: string) => {
    if (cep.length !== 8) return;
    
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        address: data.logradouro || prev.address,
        neighborhood: data.bairro || prev.neighborhood,
      }));
      
      setAddressData({
        city: data.localidade || '',
        state: data.uf || '',
      });
      
      toast.success('Endereço encontrado!');
    } catch (error) {
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cep: onlyNumbers }));
    
    if (onlyNumbers.length === 8) {
      fetchAddressByCep(onlyNumbers);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form
      checkoutSchema.parse(formData);
      
      if (cart.length === 0) {
        toast.error('Carrinho vazio');
        return;
      }

      setLoading(true);

      // Generate tracking code
      const { data: trackingData, error: trackingError } = await supabase
        .rpc('generate_tracking_code');
      
      if (trackingError) throw trackingError;

      const trackingCode = trackingData;

      // Update guest customer if exists, otherwise we'll just create the order
      if (guestToken) {
        await updateGuestCustomer(
          formData.name,
          formData.phone,
          {
            street: formData.address,
            number: formData.number,
            complement: formData.reference,
            neighborhood: formData.neighborhood,
            city: addressData.city,
            state: addressData.state,
            cep: formData.cep,
          }
        );
      }

      // Create order with tracking code, guest_token, and user_id
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null,
          guest_token: guestToken || null,
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_cep: formData.cep,
          customer_address: `${formData.address}, ${formData.number}${formData.reference ? ' - ' + formData.reference : ''}`,
          customer_neighborhood: formData.neighborhood,
          customer_city: addressData.city,
          customer_state: addressData.state,
          delivery_fee: deliveryFee,
          subtotal: subtotal,
          total: total,
          status: 'pending',
          notes: formData.notes || null,
          tracking_code: trackingCode,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Save tracking code to localStorage
      localStorage.setItem("lastOrderCode", trackingCode);

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
        subtotal: item.product.price * item.quantity,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      clearCart();
      toast.success('Pedido realizado com sucesso!');
      navigate(`/confirmacao?tracking=${trackingCode}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          toast.error(err.message);
        });
      } else {
        console.error('Error creating order:', error);
        toast.error('Erro ao criar pedido');
      }
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    navigate('/');
    return null;
  }

  return (
    <>
      <GuestModePrompt 
        open={showGuestPrompt} 
        onClose={() => setShowGuestPrompt(false)}
        onSuccess={() => setShowGuestPrompt(false)}
      />
      
      <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cart')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Finalizar Pedido</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados de Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Seu nome completo"
                  disabled={true}
                  className="bg-muted cursor-not-allowed"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nome não pode ser alterado
                </p>
              </div>

              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  disabled={true}
                  className="bg-muted cursor-not-allowed"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Telefone não pode ser alterado
                </p>
              </div>

              <Separator className="my-4" />
              
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Endereço de Entrega</h3>
                <p className="text-xs text-muted-foreground">
                  Você pode editar o endereço abaixo
                </p>
              </div>

              <div>
                <Label htmlFor="cep">CEP *</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={8}
                    required
                  />
                  {loadingCep && (
                    <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Digite o CEP para autocompletar o endereço
                </p>
              </div>

              <div>
                <Label htmlFor="address">Endereço (Rua/Avenida) *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Rua, Avenida..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="number">Número *</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                    placeholder="123"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="neighborhood">Bairro *</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                    placeholder="Bairro"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reference">Ponto de Referência</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Próximo ao mercado, em frente à praça..."
                />
              </div>

              {addressData.city && addressData.state && (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Cidade:</span> {addressData.city} - {addressData.state}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ponto de referência, instruções de entrega..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
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
                type="submit"
                size="lg"
                className="w-full mt-4"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  'Confirmar Pedido'
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
    </>
  );
};

export default Checkout;
