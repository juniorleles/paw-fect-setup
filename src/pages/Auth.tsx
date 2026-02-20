import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PawPrint, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    setSubmitting(false);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else if (isSignUp) {
      toast({
        title: "Conta criada!",
        description: "Verifique seu e-mail para confirmar o cadastro.",
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@") || !email.includes(".")) {
      toast({ title: "Erro", description: "Digite um e-mail válido.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setResetEmailSent(true);
    }
  };

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
          {resetEmailSent ? (
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <PawPrint className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-display">E-mail enviado!</CardTitle>
              <CardDescription>
                Verifique sua caixa de entrada e spam para redefinir sua senha.
              </CardDescription>
              <Button
                onClick={() => { setResetEmailSent(false); setIsForgotPassword(false); }}
                className="w-full h-12 font-bold mt-4"
              >
                Voltar para o login
              </Button>
            </CardContent>
          ) : isForgotPassword ? (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-display">Recuperar senha</CardTitle>
                <CardDescription>Enviaremos instruções para o seu e-mail</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 font-bold" disabled={submitting}>
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Aguarde...</>
                    ) : "Enviar link de recuperação"}
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-sm text-primary hover:underline"
                  >
                    Voltar para o login
                  </button>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-display">
                  {isSignUp ? "Criar conta" : "Entrar"}
                </CardTitle>
                <CardDescription>
                  {isSignUp
                    ? "Crie sua conta para configurar sua secretária digital"
                    : "Acesse sua conta para gerenciar sua secretária digital"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-semibold">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-11"
                    />
                  </div>
                  {!isSignUp && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        Esqueceu sua senha?
                      </button>
                    </div>
                  )}
                  <Button type="submit" className="w-full h-12 font-bold" disabled={submitting}>
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Aguarde...</>
                    ) : isSignUp ? "Criar conta" : "Entrar"}
                  </Button>
                </form>

                <div className="relative my-5">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                    ou
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 font-medium gap-2"
                  onClick={async () => {
                    const isCustomDomain =
                      !window.location.hostname.includes("lovable.app") &&
                      !window.location.hostname.includes("lovableproject.com");

                    let error: any = null;

                    if (isCustomDomain) {
                      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
                        provider: "google",
                        options: {
                          redirectTo: window.location.origin,
                          skipBrowserRedirect: true,
                        },
                      });
                      error = oauthError;
                      if (!error && data?.url) {
                        window.location.href = data.url;
                        return;
                      }
                    } else {
                      const result = await lovable.auth.signInWithOAuth("google", {
                        redirect_uri: window.location.origin,
                      });
                      error = result.error;
                    }
                    if (error) {
                      toast({
                        title: "Erro",
                        description: "Não foi possível entrar com Google.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Entrar com Google
                </Button>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-primary hover:underline"
                  >
                    {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Criar uma"}
                  </button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Auth;
