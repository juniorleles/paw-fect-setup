import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Loader2, Eye, EyeOff, Check, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS, type StripePlanKey } from "@/config/stripe";

const PLAN_DISPLAY: Record<string, { label: string; benefits: string[]; color: string }> = {
  free: {
    label: "Free",
    benefits: ["30 agendamentos/mês", "150 mensagens/mês", "1 profissional"],
    color: "bg-muted text-muted-foreground",
  },
  starter: {
    label: "Essencial",
    benefits: ["Agendamentos ilimitados", "800 mensagens/mês", "Até 3 profissionais"],
    color: "bg-primary/10 text-primary",
  },
  professional: {
    label: "Pro",
    benefits: ["Agendamentos ilimitados", "1.500 mensagens/mês", "Profissionais ilimitados"],
    color: "bg-primary text-primary-foreground",
  },
};

const translateAuthError = (msg: string): string => {
  const map: Record<string, string> = {
    "Password is known to be weak and easy to guess, please choose a different one.":
      "Essa senha é muito fraca e fácil de adivinhar. Por favor, escolha outra.",
    "Invalid login credentials":
      "E-mail ou senha incorretos.",
    "Email not confirmed":
      "E-mail ainda não confirmado. Verifique sua caixa de entrada.",
    "User already registered":
      "Este e-mail já está cadastrado.",
    "Signup requires a valid password":
      "A senha informada é inválida.",
    "Password should be at least 6 characters":
      "A senha deve ter pelo menos 6 caracteres.",
  };
  return map[msg] || msg;
};

const Auth = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { completed: onboardingCompleted, loading: onboardingLoading } = useOnboardingStatus();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("signup") === "true");
  const selectedPlanKey = searchParams.get("plan") || "";
  const selectedPlan = PLAN_DISPLAY[selectedPlanKey];
  const planPrice = selectedPlanKey && selectedPlanKey !== "free" && STRIPE_PLANS[selectedPlanKey as StripePlanKey]
    ? `R$${STRIPE_PLANS[selectedPlanKey as StripePlanKey].price}/mês`
    : selectedPlanKey === "free" ? "Grátis" : null;
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [justAuthenticated, setJustAuthenticated] = useState(false);
  const initialSignOutDone = useRef(false);
  
  const { toast } = useToast();

  // On mount: sign out any existing session so the form is always shown clean
  useEffect(() => {
    if (!loading && user && !initialSignOutDone.current) {
      initialSignOutDone.current = true;
      setSigningOut(true);
      signOut().finally(() => setSigningOut(false));
    } else if (!loading && !user) {
      initialSignOutDone.current = true;
    }
  }, [loading]);

  // After successful login/signup, redirect to the appropriate page
  useEffect(() => {
    if (justAuthenticated && user && !onboardingLoading) {
      if (onboardingCompleted) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    }
  }, [justAuthenticated, user, onboardingCompleted, onboardingLoading, navigate]);

  if (loading || signingOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    setSubmitting(false);

    if (error) {
      const translatedMessage = translateAuthError(error.message);
      toast({
        title: "Erro",
        description: translatedMessage,
        variant: "destructive",
      });
    } else {
      // Save chosen plan so onboarding can enforce payment for paid plans
      if (isSignUp && selectedPlanKey) {
        localStorage.setItem("chosen_plan", selectedPlanKey);
      }
      setJustAuthenticated(true);
      if (isSignUp) {
        toast({
          title: "Conta criada!",
          description: "Sua conta foi criada com sucesso. Bem-vindo!",
        });
      }
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
            <Briefcase className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-display font-bold text-foreground">
              Secretária <span className="text-primary">Digital</span>
            </h1>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-card">
          {resetEmailSent ? (
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Briefcase className="w-8 h-8 text-primary" />
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
                {isSignUp && selectedPlan && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge className={`${selectedPlan.color} text-xs font-semibold px-3 py-1 rounded-full border-0`}>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Plano {selectedPlan.label}
                      {planPrice && ` · ${planPrice}`}
                    </Badge>
                  </div>
                )}
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
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {isSignUp && (
                      <p className="text-xs text-muted-foreground">
                        Mínimo 8 caracteres. Use uma senha única que não tenha sido vazada em outros sites.
                      </p>
                    )}
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
                  {isSignUp && selectedPlan && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        Incluso no plano {selectedPlan.label}:
                      </p>
                      <ul className="space-y-1">
                        {selectedPlan.benefits.map((b) => (
                          <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
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
