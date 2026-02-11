import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import { Loader2, Save } from "lucide-react";

export default function AdminSettings() {
  const { user, isAdmin, signOut, loading: authLoading, checkingRole } = useAuth();
  const navigate = useNavigate();
  const { deliveryFee, loading: feeLoading, updateDeliveryFee } = useDeliveryFee();
  const [feeValue, setFeeValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || checkingRole) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    if (!isAdmin) { navigate("/", { replace: true }); return; }
  }, [user, isAdmin, navigate, authLoading, checkingRole]);

  useEffect(() => {
    if (!feeLoading) {
      setFeeValue(deliveryFee.toFixed(2));
    }
  }, [deliveryFee, feeLoading]);

  const handleSave = async () => {
    const parsed = parseFloat(feeValue.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Valor inválido");
      return;
    }
    setSaving(true);
    try {
      await updateDeliveryFee(parsed);
      toast.success("Taxa de entrega atualizada!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || checkingRole) {
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
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Gerencie as configurações da loja</p>
          </div>

          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Taxa de Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-fee">Valor (R$)</Label>
                <Input
                  id="delivery-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={feeValue}
                  onChange={(e) => setFeeValue(e.target.value)}
                  placeholder="0.00"
                  disabled={feeLoading}
                />
              </div>
              <Button onClick={handleSave} disabled={saving || feeLoading}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Salvar</>
                )}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
}
