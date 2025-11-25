import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock } from "lucide-react";

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
  title = "Confirmar Senha",
  description = "Por segurança, confirme sua senha para continuar",
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!password) {
      toast.error("Digite sua senha");
      return;
    }

    setLoading(true);

    try {
      // Buscar email do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        toast.error("Usuário não encontrado");
        return;
      }

      // Tentar fazer sign in com a senha fornecida para validar
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (error) {
        toast.error("Senha incorreta");
        setPassword("");
        return;
      }

      // Senha correta
      toast.success("Senha confirmada!");
      setPassword("");
      onConfirm();
    } catch (error) {
      console.error("Error confirming password:", error);
      toast.error("Erro ao confirmar senha");
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
            <Label htmlFor="password">Senha Atual</Label>
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
