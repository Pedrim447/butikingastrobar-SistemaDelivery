import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Loader2, Pencil, MapPin, CreditCard, Wallet, DollarSign, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useAuth } from '@/contexts/AuthContext';
import { safeStorage } from '@/lib/safeStorage';
import PixPayment from '@/components/PixPayment';

const checkoutSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  phone: z.string().min(10, 'Telefone inválido').max(15),
  cep: z.string()
    .min(8, 'CEP deve ter 8 dígitos')
    .max(9, 'CEP inválido')
    .regex(/^\d{5}-?\d{3}$|^\d{8}$/, 'CEP deve conter apenas números (com ou sem hífen)'),
  address: z.string().min(5, 'Endereço obrigatório').max(200),
  number: z.string().min(1, 'Número obrigatório').max(10),
  reference: z.string().max(200).optional(),
  neighborhood: z.string().min(3, 'Bairro obrigatório').max(100),
  notes: z.string().max(500).optional(),
  paymentMethod: z.enum(['pix', 'dinheiro', 'cartao_debito', 'cartao_credito']),
});

const Checkout = () => {
  const { cart, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { guestToken, guestData, updateGuestCustomer, clearGuestData, loading: guestLoading } = useGuestMode();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao_debito' | 'cartao_credito'>('dinheiro');
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [pixData, setPixData] = useState<{
    orderId: string;
    qrCode: string;
    qrCodeBase64: string;
    expiresAt: string;
    paymentId: string;
  } | null>(null);
  
  const [formData, setFormData] = useState(() => {
    try {
      const saved = safeStorage.getItem('checkout_form');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      name: '',
      phone: '',
      cep: '',
      address: '',
      number: '',
      reference: '',
      neighborhood: '',
      notes: '',
    };
  });

  // Store city and state internally (from CEP)
  const [addressData, setAddressData] = useState(() => {
    try {
      const saved = safeStorage.getItem('checkout_address');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      city: '',
      state: '',
    };
  });

  // Salvar formData no storage sempre que mudar
  useEffect(() => {
    try {
      safeStorage.setItem('checkout_form', JSON.stringify(formData));
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
    }
  }, [formData]);

  // Salvar addressData no storage sempre que mudar
  useEffect(() => {
    try {
      safeStorage.setItem('checkout_address', JSON.stringify(addressData));
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
    }
  }, [addressData]);

  // Load user profile data on mount - SOMENTE na primeira carga
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      // Se já tem dados salvos no storage, não sobrescreve
      const savedForm = safeStorage.getItem('checkout_form');
      if (savedForm) {
        try {
          const parsed = JSON.parse(savedForm);
          if (parsed.name && parsed.phone) {
            return; // Já tem dados, não carrega do perfil
          }
        } catch {}
      }
      
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

  // Load guest data on mount - SOMENTE na primeira carga
  useEffect(() => {
    if (!guestData) return;
    
    // Se já tem dados salvos no storage, não sobrescreve
    const savedForm = safeStorage.getItem('checkout_form');
    if (savedForm) {
      try {
        const parsed = JSON.parse(savedForm);
        if (parsed.name && parsed.phone && parsed.cep) {
          return; // Já tem dados, não carrega do guest
        }
      } catch {}
    }
    
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
  }, [guestData]);

  // Verificar se tem dados válidos para acessar checkout
  useEffect(() => {
    // Aguardar carregamento dos dados de guest
    if (guestLoading) return;
    
    // Se não tiver usuário autenticado E não tiver dados de guest válidos, redirecionar
    if (!user && (!guestToken || !guestData || !guestData.name || !guestData.phone)) {
      console.warn('Checkout access denied: no valid user or guest data');
      toast.error('Por favor, preencha seus dados antes de finalizar o pedido');
      navigate('/cart');
    }
  }, [user, guestToken, guestData, guestLoading, navigate]);

  const subtotal = getCartTotal();
  const deliveryFee = 5.0;
  const total = subtotal + deliveryFee;

  const fetchAddressByCep = async (cep: string) => {
    if (cep.length !== 8) return;
    
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Erro na resposta do ViaCEP:', response.status);
        toast.error('Erro ao buscar CEP. Preencha o endereço manualmente.');
        return;
      }

      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado. Verifique o número ou preencha manualmente.');
        return;
      }
      
      // Preenche apenas se tiver dados
      if (data.logradouro || data.bairro || data.localidade || data.uf) {
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
      } else {
        toast.info('CEP encontrado, mas sem dados de endereço. Preencha manualmente.');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP. Verifique sua conexão ou preencha manualmente.');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    // Remove tudo que não é número
    const onlyNumbers = value.replace(/\D/g, '');
    
    // Limita a 8 dígitos
    const limited = onlyNumbers.slice(0, 8);
    
    // Formata CEP: 00000-000
    let formatted = limited;
    if (limited.length > 5) {
      formatted = `${limited.slice(0, 5)}-${limited.slice(5)}`;
    }
    
    setFormData(prev => ({ ...prev, cep: onlyNumbers }));
    
    // Busca automaticamente quando tiver exatamente 8 dígitos
    if (onlyNumbers.length === 8) {
      fetchAddressByCep(onlyNumbers);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form
      checkoutSchema.parse({ ...formData, paymentMethod });
      
      if (cart.length === 0) {
        toast.error('Carrinho vazio');
        return;
      }

      // Validação extra: garantir que tem dados válidos para criar pedido
      if (!user && !guestToken) {
        toast.error('Por favor, preencha seus dados antes de finalizar o pedido');
        navigate('/cart');
        return;
      }

      // Validação: nome e telefone são obrigatórios
      if (!formData.name || !formData.phone) {
        toast.error('Nome e telefone são obrigatórios');
        return;
      }

      // Validação: cidade e estado são obrigatórios
      if (!addressData.city || !addressData.state) {
        toast.error('Por favor, preencha o CEP para obter cidade e estado');
        return;
      }

      setLoading(true);

      // Generate tracking code
      const { data: trackingData, error: trackingError } = await supabase
        .rpc('generate_tracking_code');
      
      if (trackingError) throw trackingError;

      const trackingCode = trackingData;

      // Update guest customer if exists
      if (guestToken) {
        const { error: updateError } = await updateGuestCustomer(
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

        // Se falhar ao atualizar dados do guest, parar o fluxo
        if (updateError) {
          console.error('Erro ao atualizar dados do guest:', updateError);
          toast.error('Erro ao atualizar seus dados. Por favor, tente novamente.');
          setLoading(false);
          return;
        }
      }

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null,
          guest_token: guestToken || null,
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_cep: formData.cep.replace(/\D/g, ''),
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
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'pix' ? 'pending' : 'paid',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Save tracking code
      safeStorage.setItem("lastOrderCode", trackingCode);

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
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

      // Se for PIX, criar pagamento
      if (paymentMethod === 'pix') {
        const { data: pixResponse, error: pixError } = await supabase.functions.invoke('create-pix-payment', {
          body: {
            orderId: orderData.id,
            amount: total,
            customerEmail: user?.email || `${formData.phone}@cliente.com`,
            customerName: formData.name,
          },
        });

        if (pixError) throw pixError;

        setPixData({
          orderId: orderData.id,
          qrCode: pixResponse.qrCode,
          qrCodeBase64: pixResponse.qrCodeBase64,
          expiresAt: pixResponse.expiresAt,
          paymentId: pixResponse.paymentId,
        });
        setShowPixPayment(true);
        setLoading(false);
      } else {
        // Para outros métodos, redirecionar direto
        safeStorage.removeItem('checkout_form');
        safeStorage.removeItem('checkout_address');
        clearCart();
        toast.success('Pedido realizado com sucesso!');
        navigate(`/confirmacao?tracking=${trackingCode}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          toast.error(err.message);
        });
      } else {
        console.error('Error creating order:', error);
        toast.error('Erro ao criar pedido');
      }
      setLoading(false);
    }
  };

  const handlePixPaymentConfirmed = () => {
    safeStorage.removeItem('checkout_form');
    safeStorage.removeItem('checkout_address');
    clearCart();
    if (pixData) {
      const trackingCode = safeStorage.getItem("lastOrderCode");
      navigate(`/confirmacao?tracking=${trackingCode}`);
    }
  };

  const handleCancelPix = async () => {
    if (pixData) {
      try {
        await supabase
          .from('orders')
          .update({ payment_status: 'cancelled', status: 'cancelled' })
          .eq('id', pixData.orderId);
      } catch (error) {
        console.error('Error cancelling order:', error);
      }
    }
    setShowPixPayment(false);
    setPixData(null);
    setLoading(false);
    toast.info('Pedido cancelado');
  };

  if (cart.length === 0) {
    navigate('/');
    return null;
  }

  if (showPixPayment && pixData) {
    return (
      <PixPayment
        orderId={pixData.orderId}
        qrCode={pixData.qrCode}
        qrCodeBase64={pixData.qrCodeBase64}
        expiresAt={pixData.expiresAt}
        paymentId={pixData.paymentId}
        onPaymentConfirmed={handlePixPaymentConfirmed}
        onCancel={handleCancelPix}
      />
    );
  }

  return (
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
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nome</p>
                  <p className="text-sm font-medium">{formData.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Telefone</p>
                  <p className="text-sm font-medium">{formData.phone}</p>
                </div>
              </div>

              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Endereço</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingAddress(!isEditingAddress)}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    {isEditingAddress ? 'Fechar' : 'Alterar'}
                  </Button>
                </div>

                {!isEditingAddress && formData.cep ? (
                  <div className="p-2.5 bg-muted/30 rounded-md border text-sm space-y-0.5">
                    <p className="font-medium">
                      {formData.address}, {formData.number}
                    </p>
                     <p className="text-xs text-muted-foreground">
                       {formData.neighborhood} • CEP {formData.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}
                     </p>
                     {addressData.city && addressData.state && (
                       <p className="text-xs text-muted-foreground">
                         {addressData.city} - {addressData.state}
                       </p>
                     )}
                  </div>
                ) : (
                  <div className="space-y-3 p-3 bg-muted/20 rounded-md border">
                     <div>
                       <Label htmlFor="cep" className="text-xs">CEP *</Label>
                       <div className="relative">
                         <Input
                           id="cep"
                           value={formData.cep}
                           onChange={(e) => handleCepChange(e.target.value)}
                           placeholder="00000-000"
                           maxLength={9}
                           className="h-9 text-sm"
                           required
                         />
                         {loadingCep && (
                           <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2.5 top-2.5 text-muted-foreground" />
                         )}
                       </div>
                       <p className="text-xs text-muted-foreground mt-1">
                         Digite o CEP (com ou sem hífen). Ex: 65000-000 ou 65000000
                       </p>
                     </div>

                    <div>
                      <Label htmlFor="address" className="text-xs">Rua/Avenida *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Nome da rua"
                        className="h-9 text-sm"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="number" className="text-xs">Número *</Label>
                        <Input
                          id="number"
                          value={formData.number}
                          onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                          placeholder="123"
                          className="h-9 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="neighborhood" className="text-xs">Bairro *</Label>
                        <Input
                          id="neighborhood"
                          value={formData.neighborhood}
                          onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                          placeholder="Bairro"
                          className="h-9 text-sm"
                          required
                        />
                      </div>
                     </div>

                     {addressData.city && addressData.state && (
                       <p className="text-xs text-muted-foreground font-medium">
                         {addressData.city} - {addressData.state}
                       </p>
                     )}
                   </div>
                 )}
               </div>

              <div>
                <Label htmlFor="reference" className="text-xs">Referência</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Ponto de referência"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-xs">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Instruções de entrega..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="flex-1 cursor-pointer flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">PIX</p>
                      <p className="text-xs text-muted-foreground">Aprovação instantânea</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="dinheiro" id="dinheiro" />
                  <Label htmlFor="dinheiro" className="flex-1 cursor-pointer flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Dinheiro</p>
                      <p className="text-xs text-muted-foreground">Pagar na entrega</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="cartao_debito" id="cartao_debito" />
                  <Label htmlFor="cartao_debito" className="flex-1 cursor-pointer flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Cartão de Débito</p>
                      <p className="text-xs text-muted-foreground">Pagar na entrega</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="cartao_credito" id="cartao_credito" />
                  <Label htmlFor="cartao_credito" className="flex-1 cursor-pointer flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Cartão de Crédito</p>
                      <p className="text-xs text-muted-foreground">Pagar na entrega</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
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
  );
};

export default Checkout;
