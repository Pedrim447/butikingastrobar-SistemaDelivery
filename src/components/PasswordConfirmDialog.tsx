import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PasswordConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export function PasswordConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = "Senha de Acesso",
  description = "Digite sua senha da conta para continuar",
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!password) {
      toast.error("Digite a senha");
      return;
    }

    setLoading(true);

    try {
      // Call edge function to verify admin password server-side
      const { data, error } = await supabase.functions.invoke('verify-admin-password', {
        body: { password }
      });

      if (error) {
        console.error('Verification error:', error);
        toast.error("Erro ao verificar senha");
        setPassword("");
        setLoading(false);
        return;
      }

      if (data?.verified) {
        toast.success("Acesso liberado!");
        setPassword("");
        onConfirm();
      } else {
        toast.error(data?.error || "Senha incorreta");
        setPassword("");
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      toast.error("Erro ao verificar senha");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword("");
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">Senha da sua conta</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirm();
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Por segurança, confirme sua senha de administrador
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={loading}>
              {loading ? "Verificando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
