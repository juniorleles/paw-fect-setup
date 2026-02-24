import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS, StripePlanKey } from "@/config/stripe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Check,
  Crown,
  Gift,
  Loader2,
  CreditCard,
  Receipt,
  AlertTriangle,
  Zap,
  Lock,
  Star,
  RotateCcw,
  XCircle,
  MessageSquare,
  ExternalLink,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SubscriptionData {
  id: string;
  status: string;
  plan: string;
  trial_start_at: string | null;
  trial_end_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payment_method: string | null;
  last_payment_status: string | null;
  created_at: string;
}

interface PaymentRecord {
  id: string;
  description: string;
  amount: number;
  status: string;
  paid_at: string | null;
}

const PLANS = {
  starter: { name: "Starter", price: STRIPE_PLANS.starter.price, limit: STRIPE_PLANS.starter.limit },
  professional: { name: "Profissional", price: STRIPE_PLANS.professional.price, limit: STRIPE_PLANS.professional.limit },
};

const MyAccount = () => {
  const { user } = useAuth();
  const { cancel, cancelling, reactivate, reactivating } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Check subscription status from Stripe on load
  const syncSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) console.error("check-subscription error:", error);
      if (data?.subscribed) {
        console.log("Stripe subscription synced:", data);
      }
    } catch (e) {
      console.error("check-subscription call failed:", e);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Sync from Stripe first
      await syncSubscription();

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [subRes, messagesRes, payRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("conversation_messages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd),
        supabase
          .from("payment_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setSub((subRes.data as unknown as SubscriptionData) ?? null);
      setMessagesUsed(messagesRes.count ?? 0);
      setPayments((payRes.data as unknown as PaymentRecord[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user, syncSubscription]);

  // Show success toast after checkout
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    if (checkoutStatus === "success") {
      toast({ title: "Pagamento realizado! 🎉", description: "Sua assinatura foi ativada com sucesso." });
      // Clean URL
      window.history.replaceState({}, "", "/my-account");
    }
  }, [searchParams, toast]);

  const handleCheckout = async (planKey: StripePlanKey) => {
    setCheckoutLoading(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: STRIPE_PLANS[planKey].price_id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e: any) {
      toast({ title: "Erro ao iniciar pagamento", description: e.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.error === "no_customer") {
        toast({ title: "Atenção", description: data.message });
        return;
      }
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const now = new Date();
  const isTrialing = sub?.status === "trialing" || (sub?.status === "active" && sub?.trial_end_at && new Date(sub.trial_end_at) > now);
  const isActive = sub?.status === "active" && !isTrialing;
  const isCancelled = sub?.status === "cancelled";
  const isExpired = sub?.status === "expired";

  const trialEndDate = sub?.trial_end_at ? new Date(sub.trial_end_at) : null;
  const trialStartDate = sub?.trial_start_at ? new Date(sub.trial_start_at) : null;
  const trialDaysLeft = trialEndDate ? Math.max(0, differenceInDays(trialEndDate, now)) : 0;
  const trialTotalDays = 7;
  const trialDaysUsed = trialTotalDays - trialDaysLeft;
  const trialProgress = (trialDaysUsed / trialTotalDays) * 100;

  const currentPlan = (sub?.plan as keyof typeof PLANS) ?? "starter";
  const planInfo = PLANS[currentPlan] ?? PLANS.starter;
  const messagesLimit = planInfo.limit;
  const usagePercent = messagesLimit > 0 ? (messagesUsed / messagesLimit) * 100 : 0;

  const nextBillingDate = sub?.current_period_end
    ? format(new Date(sub.current_period_end), "dd/MM/yyyy")
    : trialEndDate
    ? format(trialEndDate, "dd/MM/yyyy")
    : "—";

  const handleCancel = async () => {
    const { error } = await cancel();
    if (error) {
      toast({ title: "Erro ao cancelar", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Assinatura cancelada", description: "Seu acesso foi encerrado." });
    navigate("/subscription-cancelled");
  };

  const handleReactivate = async () => {
    const { error } = await reactivate();
    if (error) {
      toast({ title: "Erro ao reativar", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Assinatura reativada!", description: "Bem-vindo de volta!" });
    window.location.reload();
  };

  const statusLabel = isTrialing
    ? "Trial ativo"
    : isActive
    ? "Ativo"
    : isCancelled
    ? "Cancelado"
    : sub?.status === "past_due"
    ? "Inadimplente"
    : sub?.status === "expired"
    ? "Expirado"
    : "Sem assinatura";

  const statusColor = isTrialing
    ? "bg-accent/10 text-accent border-accent/20"
    : isActive
    ? "bg-success/10 text-success border-success/20"
    : "bg-destructive/10 text-destructive border-destructive/20";

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-display font-bold text-foreground">Minha Conta</h1>

      {/* Alert banners */}
      {isTrialing && trialDaysLeft <= 2 && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0" />
          <p className="text-sm font-medium">
            Seu trial acaba em {trialDaysLeft} dia{trialDaysLeft !== 1 ? "s" : ""}! Contrate agora para não perder acesso.
          </p>
        </div>
      )}
      {usagePercent >= 80 && usagePercent < 100 && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-accent flex-shrink-0" />
          <p className="text-sm font-medium">
            Você já usou {Math.round(usagePercent)}% das mensagens do mês.
          </p>
        </div>
      )}
      {usagePercent >= 100 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium">
            Você atingiu o limite de mensagens. {isTrialing ? "Assine para continuar." : "Faça upgrade do plano."}
          </p>
        </div>
      )}

      {/* 1. Status da assinatura */}
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-display font-bold">Plano {planInfo.name}</h2>
                <Badge className={statusColor}>{statusLabel}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isActive && `Próxima cobrança: ${nextBillingDate} • R$ ${planInfo.price}/mês`}
                {isTrialing && `Trial termina em ${nextBillingDate}`}
                {isCancelled && "Assinatura cancelada"}
                {isExpired && "Seu trial expirou. Contrate um plano para continuar."}
              </p>
            </div>
            <div className="flex gap-2">
              {(isTrialing || isExpired) && (
                <Button className="font-bold" onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}>
                  <Zap className="w-4 h-4 mr-2" />
                  {isExpired ? "Assinar agora" : "Contratar plano agora"}
                </Button>
              )}
              {(isActive || isTrialing) && (
                <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
                  Gerenciar assinatura
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* Trial progress */}
          {isTrialing && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-accent" />
                  <span className="font-medium">🎁 Trial ativo</span>
                </span>
                <span className="text-muted-foreground">
                  Faltam <span className="font-bold text-foreground">{trialDaysLeft} dias</span>
                </span>
              </div>
              <Progress value={trialProgress} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Início: {trialStartDate ? format(trialStartDate, "dd/MM", { locale: ptBR }) : "—"}</span>
                <span>{trialDaysUsed}/{trialTotalDays} dias</span>
                <span>Término: {trialEndDate ? format(trialEndDate, "dd/MM", { locale: ptBR }) : "—"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Uso / Limites */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Consumo de mensagens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Mensagens usadas este mês</span>
            <span className="font-bold">{messagesUsed} / {messagesLimit}</span>
          </div>
          <Progress value={Math.min(usagePercent, 100)} className={`h-3 ${usagePercent >= 100 ? "[&>div]:bg-destructive" : usagePercent >= 80 ? "[&>div]:bg-accent" : ""}`} />
          <p className="text-xs text-muted-foreground">
            Renova em: {nextBillingDate}
          </p>
        </CardContent>
      </Card>

      {/* 3. Planos disponíveis */}
      <div id="plans" className="space-y-4">
        <h2 className="text-lg font-display font-bold">Planos disponíveis</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Starter */}
          <Card className={`border-2 ${currentPlan === "starter" && !isCancelled ? "border-primary shadow-lg" : "border-transparent"}`}>
            <CardContent className="p-5 flex flex-col h-full">
              <Badge className="w-fit mb-2 bg-destructive text-destructive-foreground text-xs">🔥 Fundador</Badge>
              <h3 className="font-display font-bold text-lg">Starter</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold">R$ {STRIPE_PLANS.starter.price}</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-primary font-medium mb-3">7 dias grátis</p>
              <ul className="space-y-1.5 mb-4 flex-1 text-sm">
                {["1 número WhatsApp", "Até 1.000 msgs/mês", "Respostas automáticas", "Horário de atendimento", "Suporte padrão"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {currentPlan === "starter" && !isCancelled && !isExpired ? (
                <Button variant="outline" disabled className="w-full">Plano atual</Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleCheckout("starter")}
                  disabled={checkoutLoading === "starter"}
                >
                  {checkoutLoading === "starter" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Assinar Starter
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Profissional */}
          <Card className={`border-2 ${currentPlan === "professional" && !isCancelled ? "border-primary shadow-lg" : "border-primary/50"} scale-[1.02]`}>
            <CardContent className="p-5 flex flex-col h-full">
              <Badge className="w-fit mb-2 bg-primary text-primary-foreground text-xs">⭐ Mais Popular</Badge>
              <h3 className="font-display font-bold text-lg">Profissional</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold">R$ {STRIPE_PLANS.professional.price}</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-primary font-medium mb-3">7 dias grátis</p>
              <ul className="space-y-1.5 mb-4 flex-1 text-sm">
                {["Tudo do Starter +", "Até 3.000 msgs/mês", "IA personalizada", "Fluxos customizados", "Suporte prioritário"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {currentPlan === "professional" && !isCancelled ? (
                <Button disabled className="w-full">Plano atual</Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleCheckout("professional")}
                  disabled={checkoutLoading === "professional"}
                >
                  {checkoutLoading === "professional" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Star className="w-4 h-4 mr-1" />}
                  {currentPlan === "starter" && !isCancelled ? "Fazer upgrade" : "Assinar Profissional"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Empresarial */}
          <Card className="border-2 border-transparent opacity-80">
            <CardContent className="p-5 flex flex-col h-full">
              <Badge variant="secondary" className="w-fit mb-2 text-xs">🚀 Em breve</Badge>
              <h3 className="font-display font-bold text-lg">Empresa</h3>
              <div className="mb-1">
                <Lock className="inline w-4 h-4 text-muted-foreground mr-1" />
                <span className="text-xl font-bold text-muted-foreground">Em breve</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Teste gratuito no lançamento</p>
              <ul className="space-y-1.5 mb-4 flex-1 text-sm opacity-60">
                {["Múltiplos WhatsApp", "Msgs ilimitadas", "Integrações avançadas", "Gerente dedicado"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" disabled>Entrar na lista de espera</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Forma de pagamento - agora via Stripe Portal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Forma de pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isActive || isTrialing ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Gerencie sua forma de pagamento pelo Stripe</p>
              <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                Gerenciar pagamento
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">Assine um plano para configurar pagamento</p>
              <Button variant="outline" onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}>
                <CreditCard className="w-4 h-4 mr-2" />
                Ver planos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Histórico de pagamentos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Histórico de pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum pagamento registrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Data</th>
                    <th className="pb-2 font-medium text-muted-foreground">Descrição</th>
                    <th className="pb-2 font-medium text-muted-foreground">Valor</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2">{p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy") : "—"}</td>
                      <td className="py-2">{p.description}</td>
                      <td className="py-2">R$ {Number(p.amount).toFixed(2)}</td>
                      <td className="py-2">
                        <Badge variant={p.status === "paid" ? "default" : "destructive"} className={p.status === "paid" ? "bg-success/10 text-success border-success/20" : ""}>
                          {p.status === "paid" ? "Pago" : p.status === "pending" ? "Pendente" : "Falhou"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Gerenciar assinatura */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gerenciar assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(isActive || isTrialing) && (
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
                Portal do cliente
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5">
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar assinatura
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {isTrialing
                        ? "Ao cancelar durante o trial, seu acesso será encerrado imediatamente."
                        : "Ao cancelar, você perde acesso premium ao final do período pago."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {cancelling && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Confirmar cancelamento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          {isCancelled && (
            <Button onClick={handleReactivate} disabled={reactivating}>
              {reactivating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Reativar assinatura
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAccount;
