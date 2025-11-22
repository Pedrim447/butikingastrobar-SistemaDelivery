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
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);

  const { createGuestCustomer } = useGuestMode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !phone || !street || !number || !neighborhood || !city || !state || !cep) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    const address: GuestAddress = {
      street,
      number,
      complement: complement || undefined,
      neighborhood,
      city,
      state,
      cep,
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
              <Label htmlFor="cep">CEP *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cep"
                  type="text"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                  maxLength={9}
                  required
                />
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro *</Label>
              <Input
                id="neighborhood"
                type="text"
                placeholder="Nome do bairro"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                type="text"
                placeholder="Nome da cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado *</Label>
              <Input
                id="state"
                type="text"
                placeholder="UF"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                disabled={loading}
                maxLength={2}
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
