import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useGuestMode, GuestAddress } from '@/hooks/useGuestMode';
import { User, Phone, MapPin, Home, Loader2 } from 'lucide-react';

interface GuestModePromptProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GuestModePrompt = ({ open, onClose, onSuccess }: GuestModePromptProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  const { createGuestCustomer } = useGuestMode();

  const fetchAddressByCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) return;

    // Validar se o CEP é de São Luís (começa com 65)
    if (!cleanCep.startsWith('65')) {
      toast.error('Desculpe, só aceitamos entregas em São Luís - MA');
      setStreet('');
      setNeighborhood('');
      return;
    }
    
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      // Verificar se o CEP é de São Luís
      if (data.localidade !== 'São Luís') {
        toast.error('Desculpe, só aceitamos entregas em São Luís - MA');
        setStreet('');
        setNeighborhood('');
        return;
      }
      
      setStreet(data.logradouro || '');
      setNeighborhood(data.bairro || '');
      
      toast.success('Endereço encontrado!');
    } catch (error) {
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    // Remove tudo que não é número
    const onlyNumbers = value.replace(/\D/g, '');
    
    // Formata CEP: 00000-000
    let formatted = onlyNumbers;
    if (onlyNumbers.length > 5) {
      formatted = `${onlyNumbers.slice(0, 5)}-${onlyNumbers.slice(5, 8)}`;
    }
    
    setCep(formatted);
    
    // Busca automaticamente quando tiver 8 dígitos
    if (onlyNumbers.length === 8) {
      fetchAddressByCep(onlyNumbers);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCep = cep.replace(/\D/g, '');

    if (!name || !phone || !street || !number || !neighborhood || !cleanCep) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Validar CEP de São Luís
    if (!cleanCep.startsWith('65')) {
      toast.error('Desculpe, só aceitamos entregas em São Luís - MA');
      return;
    }

    setLoading(true);

    const address: GuestAddress = {
      street,
      number,
      complement: complement || undefined,
      neighborhood,
      city: 'São Luís',
      state: 'MA',
      cep: cleanCep,
    };

    const { token, error } = await createGuestCustomer(name, phone, address);

    if (error) {
      toast.error('Erro ao salvar seus dados');
      setLoading(false);
      return;
    }

    toast.success('Dados salvos! Agora você pode fazer pedidos como convidado.');
    setLoading(false);
    onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete seus dados</DialogTitle>
          <DialogDescription>
            Para continuar como convidado, precisamos de algumas informações básicas. 
            Seus dados serão salvos no navegador para facilitar próximas compras.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="phone">Telefone *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cep">CEP * (Apenas São Luís - MA)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cep"
                  type="text"
                  placeholder="65000-000"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  disabled={loading || loadingCep}
                  className="pl-10"
                  maxLength={9}
                  required
                />
                {loadingCep && (
                  <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Digite o CEP e o endereço será preenchido automaticamente
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street">Rua *</Label>
              <div className="relative">
                <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="street"
                  type="text"
                  placeholder="Nome da rua"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="number">Número *</Label>
              <Input
                id="number"
                type="text"
                placeholder="123"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                type="text"
                placeholder="Apto, bloco, etc"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="neighborhood">Bairro *</Label>
              <Input
                id="neighborhood"
                type="text"
                placeholder="Nome do bairro"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                disabled={loading || loadingCep}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar e Continuar'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
