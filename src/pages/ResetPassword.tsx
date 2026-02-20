import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PawPrint, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { isRecovery, clearRecovery, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Also detect recovery from URL hash (in case page is loaded directly)
  const [hashRecovery, setHashRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setHashRecovery(true);
    }
  }, []);

  const isValidRecovery = isRecovery || hashRecovery;

  const getPasswordErrors = (): string[] => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("Mínimo de 8 caracteres");
    if (password && !/[a-zA-Z]/.test(password)) errors.push("Pelo menos 1 letra");
    if (password && !/\d/.test(password)) errors.push("Pelo menos 1 número");
    if (confirmPassword && password !== confirmPassword) errors.push("As senhas não coincidem");
    return errors;
  };

  const isFormValid = PASSWORD_REGEX.test(password) && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast({ title: "Erro", description: "Corrija os erros na senha.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      clearRecovery();
      // Sign out so user must login with new password
      await signOut();
    }
  };

  // Invalid/expired link
  if (!isValidRecovery && !success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground mb-2">Link inválido ou expirado</h2>
          <p className="text-muted-foreground mb-6">Este link de recuperação não é mais válido. Solicite um novo link.</p>
          <Button onClick={() => navigate("/auth")} className="font-bold">
            Solicitar novo link
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-2">
              <PawPrint className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-display font-bold text-foreground">
                Secretária <span className="text-primary">Pet</span>
              </h1>
            </div>
          </div>
          <Card className="border-none shadow-xl bg-card">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <CardTitle className="text-2xl font-display">Senha alterada com sucesso!</CardTitle>
              <CardDescription>
                Sua senha foi redefinida. Faça login com sua nova senha para continuar.
              </CardDescription>
              <Button onClick={() => navigate("/auth")} className="w-full h-12 font-bold mt-4">
                Ir para o login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reset form
  const errors = getPasswordErrors();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <PawPrint className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-display font-bold text-foreground">
              Secretária <span className="text-primary">Pet</span>
            </h1>
          </div>
        </div>
        <Card className="border-none shadow-xl bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display">Redefinir senha</CardTitle>
            <CardDescription>Crie uma nova senha para sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="font-semibold">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-semibold">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {/* Validation hints */}
              {(password || confirmPassword) && errors.length > 0 && (
                <ul className="text-sm space-y-1">
                  {errors.map((err) => (
                    <li key={err} className="text-destructive flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-destructive inline-block" />
                      {err}
                    </li>
                  ))}
                </ul>
              )}

              <Button type="submit" className="w-full h-12 font-bold" disabled={submitting || !isFormValid}>
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Aguarde...</>
                ) : "Salvar nova senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
