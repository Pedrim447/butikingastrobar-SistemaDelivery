import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Bike } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [riderEmail, setRiderEmail] = useState('');
  const [riderPassword, setRiderPassword] = useState('');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('admin');
  const navigate = useNavigate();
  const { signIn, user, isAdmin, isDeliveryRider } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      if (isAdmin) {
        navigate('/admin');
      } else if (isDeliveryRider) {
        navigate('/delivery');
      } else {
        navigate('/');
      }
    }
  }, [user, isAdmin, isDeliveryRider, navigate, loading]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminEmail || !adminPassword) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(adminEmail, adminPassword);
      
      if (error) {
        toast.error(error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : 'Erro ao fazer login'
        );
        setLoading(false);
      } else {
        toast.success('Login realizado com sucesso!');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login');
      setLoading(false);
    }
  };

  const handleRiderSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!riderEmail || !riderPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(riderEmail, riderPassword);
      
      if (error) {
        toast.error('Email ou senha incorretos');
        setLoading(false);
      } else {
        toast.success('Login realizado com sucesso!');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login');
      setLoading(false);
    }
  };

  const handleRiderSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!riderEmail || !riderPassword || !riderName || !riderPhone) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (riderPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: riderEmail,
        password: riderPassword,
        options: {
          data: {
            name: riderName,
            phone: riderPhone,
          },
        },
      });

      if (authError) {
        toast.error(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error('Erro ao criar conta');
        setLoading(false);
        return;
      }

      const { error: riderError } = await supabase
        .from('delivery_riders')
        .insert({
          user_id: authData.user.id,
          name: riderName,
          phone: riderPhone,
        });

      if (riderError) {
        console.error('Error creating rider profile:', riderError);
        toast.error('Erro ao criar perfil de entregador');
        setLoading(false);
        return;
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'delivery_rider',
        });

      if (roleError) {
        console.error('Error adding role:', roleError);
        toast.error('Erro ao configurar permissões');
        setLoading(false);
        return;
      }

      toast.success('Cadastro realizado com sucesso!');
      
      const { error: loginError } = await signIn(riderEmail, riderPassword);
      
      if (loginError) {
        toast.info('Por favor, faça login com suas credenciais');
        setLoading(false);
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Erro ao criar conta');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl text-center">Acesso ao Sistema</CardTitle>
          <CardDescription className="text-center">
            Entre como administrador ou entregador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin">
                <Lock className="h-4 w-4 mr-2" />
                Admin
              </TabsTrigger>
              <TabsTrigger value="rider">
                <Bike className="h-4 w-4 mr-2" />
                Entregador
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="admin">
              <form onSubmit={handleAdminSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@fastfood.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Senha</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="rider">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleRiderSignIn} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="rider-login-email">Email</Label>
                      <Input
                        id="rider-login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={riderEmail}
                        onChange={(e) => setRiderEmail(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rider-login-password">Senha</Label>
                      <Input
                        id="rider-login-password"
                        type="password"
                        placeholder="••••••••"
                        value={riderPassword}
                        onChange={(e) => setRiderPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={loading}
                    >
                      {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleRiderSignUp} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="rider-name">Nome Completo</Label>
                      <Input
                        id="rider-name"
                        type="text"
                        placeholder="Seu nome"
                        value={riderName}
                        onChange={(e) => setRiderName(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rider-phone">Telefone</Label>
                      <Input
                        id="rider-phone"
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={riderPhone}
                        onChange={(e) => setRiderPhone(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rider-signup-email">Email</Label>
                      <Input
                        id="rider-signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={riderEmail}
                        onChange={(e) => setRiderEmail(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rider-signup-password">Senha</Label>
                      <Input
                        id="rider-signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={riderPassword}
                        onChange={(e) => setRiderPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={loading}
                    >
                      {loading ? 'Cadastrando...' : 'Cadastrar'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
          
          <Button
            type="button"
            variant="ghost"
            className="w-full mt-4"
            onClick={() => navigate('/')}
          >
            Voltar ao Cardápio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
