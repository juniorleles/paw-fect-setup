import { useEffect, useState, useCallback, useRef } from "react";
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
  Loader2,
  CreditCard,
  Receipt,
  Zap,
  Lock,
  Star,
  RotateCcw,
  XCircle,
  MessageSquare,
  ExternalLink,
  Settings,
  TrendingUp,
  CalendarCheck,
  DollarSign,
  Rocket,
  Flame,
  Target,
  Sparkles,
  Unlock,
} from "lucide-react";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";

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
  next_plan: string | null;
  next_plan_effective_at: string | null;
}

interface PaymentRecord {
  id: string;
  description: string;
  amount: number;
  status: string;
  paid_at: string | null;
}

const PLANS = {
  starter: { name: "Essencial", price: STRIPE_PLANS.starter.price, limit: STRIPE_PLANS.starter.limit },
  professional: { name: "Pro", price: STRIPE_PLANS.professional.price, limit: STRIPE_PLANS.professional.limit },
};

// Ticket médio estimado (usado para calcular valor gerado)
const ESTIMATED_TICKET = 80;

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
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [planChangeLoading, setPlanChangeLoading] = useState<string | null>(null);
  const [planChangePreview, setPlanChangePreview] = useState<any>(null);
  const [planChangeDialogOpen, setPlanChangeDialogOpen] = useState(false);

  const syncInFlightRef = useRef(false);
  const lastSyncedUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;

  // Check subscription status from Stripe on load (without forcing refresh loop)
  const syncSubscription = useCallback(async () => {
    if (!userId) return;
    if (syncInFlightRef.current) return;
    if (lastSyncedUserIdRef.current === userId) return;

    syncInFlightRef.current = true;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.warn("No active session for check-subscription, skipping sync");
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (error) {
        const message = String(error.message || error);

        // Retry once with refresh only when auth is actually invalid
        if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData?.session) {
            const retry = await supabase.functions.invoke("check-subscription");
            if (retry.error) {
              console.error("check-subscription retry error:", retry.error);
              return;
            }
            if (retry.data?.subscribed) {
              console.log("Stripe subscription synced:", retry.data);
            }
            lastSyncedUserIdRef.current = userId;
            return;
          }
        }

        console.error("check-subscription error:", error);
        return;
      }

      if (data?.subscribed) {
        console.log("Stripe subscription synced:", data);
      }

      lastSyncedUserIdRef.current = userId;
    } catch (e) {
      console.error("check-subscription call failed:", e);
    } finally {
      syncInFlightRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setSub(null);
      setMessagesUsed(0);
      setPayments([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const [subRes, messagesRes, payRes] = await Promise.all([
          supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(1),
          supabase
            .from("conversation_messages")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", monthStart)
            .lte("created_at", monthEnd),
          supabase
            .from("payment_history")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        if (!isMounted) return;

        if (subRes.error || messagesRes.error || payRes.error) {
          throw new Error(
            subRes.error?.message || messagesRes.error?.message || payRes.error?.message || "Falha ao carregar dados da conta"
          );
        }

        setSub((subRes.data?.[0] as unknown as SubscriptionData) ?? null);
        setMessagesUsed(messagesRes.count ?? 0);
        setPayments((payRes.data as unknown as PaymentRecord[]) ?? []);

        await syncSubscription();

        if (!isMounted) return;

          const { data, error: refreshedSubError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(1);

        if (!refreshedSubError && data && data.length > 0) {
          setSub(data[0] as unknown as SubscriptionData);
        }
      } catch (e: any) {
        console.error("MyAccount load error:", e);
        if (isMounted) {
          toast({
            title: "Erro ao carregar Minha Conta",
            description: e?.message || "Tente novamente em alguns segundos.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [userId, syncSubscription, toast]);

  // Show success toast after checkout
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    if (checkoutStatus === "success") {
      toast({ title: "Pagamento realizado! 🎉", description: "Sua assinatura foi ativada com sucesso." });
      window.history.replaceState({}, "", "/my-account");
    }
  }, [searchParams, toast]);

  const redirectToExternalUrl = (url: string) => {
    const inIframe = window.self !== window.top;

    if (inIframe) {
      const opened = window.open(url, "_top");
      if (opened) return;
    }

    window.location.assign(url);
  };

  const handleCheckout = async (planKey: StripePlanKey) => {
    setCheckoutLoading(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planKey },
      });
      if (error) {
        console.error("create-checkout error:", error);
        toast({ title: "Erro ao iniciar pagamento", description: String(error.message || error), variant: "destructive" });
        setCheckoutLoading(null);
        return;
      }
      if (data?.url) {
        redirectToExternalUrl(data.url);
        return;
      }
      console.error("create-checkout no URL:", data);
      toast({ title: "Erro ao iniciar pagamento", description: "Não foi possível gerar o link de pagamento.", variant: "destructive" });
    } catch (e: any) {
      console.error("create-checkout exception:", e);
      toast({ title: "Erro ao iniciar pagamento", description: e.message || "Erro inesperado", variant: "destructive" });
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
        redirectToExternalUrl(data.url);
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const handlePlanChange = async (targetPlan: string) => {
    setPlanChangeLoading(targetPlan);
    try {
      const { data, error } = await supabase.functions.invoke("change-plan", {
        body: { targetPlan, action: "preview" },
      });
      if (error) throw new Error(String(error.message || error));
      if (data?.error) throw new Error(data.error);
      setPlanChangePreview({ ...data, targetPlan });
      setPlanChangeDialogOpen(true);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setPlanChangeLoading(null);
    }
  };

  const confirmPlanChange = async () => {
    if (!planChangePreview) return;
    setPlanChangeLoading(planChangePreview.targetPlan);
    setPlanChangeDialogOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke("change-plan", {
        body: { targetPlan: planChangePreview.targetPlan, action: "confirm" },
      });
      if (error) throw new Error(String(error.message || error));
      if (data?.error) throw new Error(data.error);
      toast({
        title: data.type === "upgrade" ? "Upgrade realizado! 🎉" : "Downgrade agendado",
        description: data.message,
      });
      setPlanChangePreview(null);
      window.location.reload();
    } catch (e: any) {
      toast({ title: "Erro ao alterar plano", description: e.message, variant: "destructive" });
    } finally {
      setPlanChangeLoading(null);
    }
  };

  const cancelScheduledDowngrade = async () => {
    try {
      await supabase
        .from("subscriptions")
        .update({ next_plan: null, next_plan_effective_at: null })
        .eq("user_id", userId!);
      toast({ title: "Downgrade cancelado", description: "Seu plano atual será mantido." });
      window.location.reload();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
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
  // hasPaidPeriod: user has a paid subscription period (current_period_end set by Stripe webhook)
  // Either: trial_end_at exists AND current_period_end > trial_end_at (upgraded from trial)
  // OR: trial_end_at is null AND current_period_end exists (direct paid subscription, webhook cleared trial_end_at)
  const hasPaidPeriod = sub?.current_period_end && (
    !sub?.trial_end_at || new Date(sub.current_period_end) > new Date(sub.trial_end_at)
  );
  const isTrialQuotaUser = sub?.status === "active" && !hasPaidPeriod;
  const isActive = sub?.status === "active" && hasPaidPeriod;
  const isCancelled = sub?.status === "cancelled";
  const isExpired = sub?.status === "expired";

  // Quota-based trial data
  const trialAptsUsed = (sub as any)?.trial_appointments_used ?? 0;
  const trialAptsLimit = (sub as any)?.trial_appointments_limit ?? 30;
  const trialMsgsUsed = (sub as any)?.trial_messages_used ?? 0;
  const trialMsgsLimit = (sub as any)?.trial_messages_limit ?? 150;
  const trialAptsPercent = trialAptsLimit > 0 ? (trialAptsUsed / trialAptsLimit) * 100 : (trialAptsLimit === -1 ? 0 : 0);
  const trialMsgsPercent = trialMsgsLimit > 0 ? (trialMsgsUsed / trialMsgsLimit) * 100 : 0;
  const trialQuotaExhausted = (trialAptsLimit !== -1 && trialAptsUsed >= trialAptsLimit) || trialMsgsUsed >= trialMsgsLimit;
  const maxTrialPercent = Math.max(trialAptsPercent, trialMsgsPercent);

  const currentPlan = (sub?.plan as keyof typeof PLANS) ?? "starter";
  const planInfo = PLANS[currentPlan] ?? PLANS.starter;
  const messagesLimit = planInfo.limit;
  const usagePercent = messagesLimit > 0 ? (messagesUsed / messagesLimit) * 100 : 0;

  const nextBillingDate = sub?.current_period_end
    ? format(new Date(sub.current_period_end), "dd/MM/yyyy")
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

  // Estimated value generated
  const estimatedValue = trialAptsUsed * ESTIMATED_TICKET;

  // Dynamic CTA — only visible at 50%+
  const showTrialCTA = maxTrialPercent >= 50 || trialQuotaExhausted;
  const isHighlightCTA = maxTrialPercent >= 80 || trialQuotaExhausted;

  // Status display
  const statusLabel = isTrialQuotaUser
    ? trialQuotaExhausted ? "Trial esgotado" : "🔥 Trial ativo — sua IA já está trabalhando"
    : isActive
    ? "Ativo"
    : isCancelled
    ? "Cancelado"
    : sub?.status === "past_due"
    ? "Inadimplente"
    : sub?.status === "expired"
    ? "Expirado"
    : "Sem assinatura";

  const statusColor = isTrialQuotaUser && !trialQuotaExhausted
    ? "bg-accent/10 text-accent border-accent/20"
    : isActive
    ? "bg-success/10 text-success border-success/20"
    : "bg-destructive/10 text-destructive border-destructive/20";

  const aptsAvailable = trialAptsLimit === -1 ? -1 : Math.max(0, trialAptsLimit - trialAptsUsed);
  const msgsAvailable = Math.max(0, trialMsgsLimit - trialMsgsUsed);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-display font-bold text-foreground">Minha Conta</h1>

      {/* Urgency message when near quota end */}
      {isTrialQuotaUser && !trialQuotaExhausted && maxTrialPercent >= 70 && (
        <div className="rounded-xl border border-accent/30 bg-gradient-to-r from-accent/5 to-primary/5 p-4 flex items-center gap-3">
          <Zap className="w-5 h-5 text-accent flex-shrink-0" />
          <p className="text-sm font-semibold text-foreground">
            ⚡ Sua IA já está agendando clientes — não interrompa seu crescimento.
          </p>
          <Button size="sm" className="ml-auto whitespace-nowrap" onClick={() => setUpgradeModalOpen(true)}>
            <Flame className="w-4 h-4 mr-1" />
            Desbloquear
          </Button>
        </div>
      )}

      {/* Blocked banner */}
      {isTrialQuotaUser && trialQuotaExhausted && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-destructive">Seu limite foi atingido.</p>
            <p className="text-xs text-muted-foreground">Desbloqueie mais atendimentos para continuar.</p>
          </div>
          <Button size="sm" variant="destructive" className="ml-auto whitespace-nowrap" onClick={() => setUpgradeModalOpen(true)}>
            <Unlock className="w-4 h-4 mr-1" />
            Desbloquear
          </Button>
        </div>
      )}

      {/* 1. Status + Progress Hero Card */}
      <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <Crown className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-display font-bold">Plano {planInfo.name}</h2>
                <Badge className={`${statusColor} text-xs px-3 py-1`}>{statusLabel}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isActive && `Próxima cobrança: ${nextBillingDate} • R$ ${planInfo.price}/mês`}
                {isTrialQuotaUser && !trialQuotaExhausted && "Sua secretária digital está trabalhando para você"}
                {isTrialQuotaUser && trialQuotaExhausted && "Ative um plano para continuar crescendo"}
                {isCancelled && "Assinatura cancelada"}
                {isExpired && "Ative um plano para continuar crescendo"}
              </p>
            </div>
            <div className="flex gap-2">
              {isTrialQuotaUser && showTrialCTA && (
                <Button
                  className={`font-bold ${isHighlightCTA ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg" : ""}`}
                  onClick={() => setUpgradeModalOpen(true)}
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Desbloquear mais atendimentos
                </Button>
              )}
              {isExpired && (
                <Button onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}>
                  <Zap className="w-4 h-4 mr-2" />
                  Ativar plano
                </Button>
              )}
              {(isActive || isTrialQuotaUser) && (
                <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
                  Gerenciar assinatura
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* Trial progress — results-oriented */}
          {isTrialQuotaUser && !trialQuotaExhausted && (
            <div className="mt-6 space-y-4">
              {/* Motivational message when usage is low */}
              {maxTrialPercent < 30 && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-sm text-foreground">
                    🎯 Complete seus primeiros agendamentos para liberar todo o potencial da IA
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Appointments progress */}
                <div className="space-y-2 rounded-lg bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarCheck className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Clientes agendados pela IA</span>
                  </div>
                  {trialAptsLimit === -1 ? (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="text-success font-semibold">Ilimitados</span>
                      <span className="font-bold text-foreground">{trialAptsUsed} agendamentos</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{aptsAvailable} agendamentos disponíveis</span>
                        <span className="font-bold text-foreground">{trialAptsUsed}/{trialAptsLimit}</span>
                      </div>
                      <Progress value={Math.min(trialAptsPercent, 100)} className={`h-2.5 ${trialAptsPercent >= 80 ? "[&>div]:bg-accent" : ""}`} />
                    </>
                  )}
                </div>

                {/* Messages progress */}
                <div className="space-y-2 rounded-lg bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Mensagens atendidas pela IA</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{msgsAvailable} mensagens disponíveis</span>
                    <span className="font-bold text-foreground">{trialMsgsUsed}/{trialMsgsLimit}</span>
                  </div>
                  <Progress value={Math.min(trialMsgsPercent, 100)} className={`h-2.5 ${trialMsgsPercent >= 80 ? "[&>div]:bg-accent" : ""}`} />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Valor estimado gerado */}
      {isTrialQuotaUser && trialAptsUsed > 0 && (
        <Card className="border border-success/20 bg-gradient-to-r from-success/5 to-transparent">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-full bg-success/10 p-3">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                💰 Valor estimado gerado pela IA
                <TrendingUp className="w-4 h-4 text-success" />
              </p>
              <p className="text-2xl font-display font-bold text-success">
                R$ {estimatedValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                Baseado em {trialAptsUsed} agendamento{trialAptsUsed !== 1 ? "s" : ""} × ticket médio de R$ {ESTIMATED_TICKET}
              </p>
            </div>
            {!trialQuotaExhausted && maxTrialPercent >= 40 && (
              <div className="hidden sm:block">
                <Button size="sm" variant="outline" className="border-success/30 text-success hover:bg-success/5" onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Não pare aqui
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Consumo mensal de mensagens — only for paid plans */}
      {isActive && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Mensagens atendidas este mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Conversas respondidas pela IA</span>
              <span className="font-bold">{messagesUsed} / {messagesLimit}</span>
            </div>
            <Progress value={Math.min(usagePercent, 100)} className={`h-3 ${usagePercent >= 100 ? "[&>div]:bg-destructive" : usagePercent >= 80 ? "[&>div]:bg-accent" : ""}`} />
            <p className="text-xs text-muted-foreground">
              Renova em: {nextBillingDate}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 4. Planos disponíveis */}
      <div id="plans" className="space-y-4">
        <h2 className="text-lg font-display font-bold">Planos disponíveis</h2>
        <div className="grid sm:grid-cols-3 gap-4 items-stretch">
          {/* Free / Starter */}
          <Card className={`border-2 transition-all ${currentPlan === "starter" && !isCancelled && !isActive ? "border-primary shadow-lg" : "border-border/60"} bg-muted/30`}>
            <CardContent className="p-5 flex flex-col h-full">
              <Badge variant="secondary" className="w-fit mb-2 text-[11px]">🔥 Comece Grátis</Badge>
              <h3 className="font-display font-bold text-lg">Free</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold">R$ 0</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-primary font-medium mb-3">Ideal para testar a automação</p>
              <ul className="space-y-1.5 mb-3 flex-1 text-sm">
                {["1 número de WhatsApp", "1 atendente por horário", "Até 30 agendamentos/mês", "Até 150 mensagens/mês", "1 lembrete automático (24h antes)"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-1.5 mb-4 text-sm">
                {["Sem lembrete duplo", "Sem campanhas automáticas", "Sem recuperação de inativos"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-muted-foreground/70">
                    <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {currentPlan === "starter" && !isCancelled && !isActive ? (
                <Button variant="outline" disabled className="w-full">Plano atual</Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>Free</Button>
              )}
            </CardContent>
          </Card>

          {/* Essencial */}
          <Card className={`border-2 transition-all relative overflow-hidden ${(currentPlan === "starter" && isActive) ? "border-primary shadow-xl" : "border-primary/50 shadow-lg"} scale-[1.02]`}>
            <CardContent className="p-5 flex flex-col h-full">
              <Badge className="w-fit mb-2 bg-primary text-primary-foreground text-xs">
                <Star className="w-3 h-3 mr-1 fill-current" /> Mais Escolhido
              </Badge>
              <h3 className="font-display font-bold text-lg">Essencial</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold">R$ {STRIPE_PLANS.starter.price}</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-primary font-medium mb-3">Automação completa para seu negócio</p>
              <ul className="space-y-1.5 mb-4 flex-1 text-sm">
                {[
                  "1 número de WhatsApp",
                  "Agendamentos ilimitados",
                  "Até 800 mensagens/mês",
                  "Lembrete duplo (24h + 3h)",
                  "Botão Confirmar / Reagendar",
                  "Lista de clientes inativos",
                  "Recuperação automática de faltas",
                  "Relatório de faltas evitadas",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {currentPlan === "starter" && isActive ? (
                <Button disabled className="w-full">Plano atual</Button>
              ) : (
                <Button
                  className="w-full shadow-lg shadow-primary/20 font-bold"
                  onClick={() => handleCheckout("starter")}
                  disabled={checkoutLoading === "starter"}
                >
                  {checkoutLoading === "starter" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Star className="w-4 h-4 mr-1" />}
                  {currentPlan === "professional" && isActive ? "Fazer downgrade" : "Fazer upgrade"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Pro */}
          <Card className={`border-2 transition-all relative overflow-hidden ${(currentPlan === "professional" && isActive) ? "border-primary shadow-xl" : "border-primary/40 shadow-md hover:shadow-lg"}`}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
            <CardContent className="p-5 flex flex-col h-full">
              <Badge className="w-fit mb-2 bg-primary/15 text-primary border-primary/30" variant="outline">🚀 Para Quem Quer Crescer</Badge>
              <h3 className="font-display font-bold text-lg">Pro</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold">R$ {STRIPE_PLANS.professional.price}</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-primary font-medium mb-3">Automação inteligente com campanhas</p>
              <ul className="space-y-1.5 mb-4 flex-1 text-sm">
                {[
                  "1 número de WhatsApp",
                  "Agendamentos ilimitados",
                  "Até 1.500 mensagens/mês",
                  "Lembrete duplo (24h + 3h)",
                  "Botão Confirmar / Reagendar",
                  "Lista automática de inativos",
                  "Campanha automática de retorno",
                  "Recuperação automática de faltas",
                  "Upsell automático de serviços",
                  "Relatório de faturamento estimado",
                  "Prioridade no suporte",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {currentPlan === "professional" && isActive ? (
                <Button disabled className="w-full">Plano atual</Button>
              ) : (
                <Button
                  className="w-full bg-primary/90 hover:bg-primary font-bold"
                  onClick={() => handleCheckout("professional")}
                  disabled={checkoutLoading === "professional"}
                >
                  {checkoutLoading === "professional" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-1" />}
                  Fazer upgrade
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          * <strong>Atendente</strong> refere-se à quantidade de agendamentos simultâneos permitidos no mesmo horário. 
          No Free, 1 agendamento por horário. No Essencial, até 3 ao mesmo tempo. A IA responde a todos os clientes sem limite.
        </p>
      </div>

      {/* 5. Forma de pagamento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Forma de pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isActive || isTrialQuotaUser ? (
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

      {/* 6. Histórico de pagamentos */}
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

      {/* 7. Gerenciar assinatura */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gerenciar assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(isActive || isTrialQuotaUser) && (
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
                      {isTrialQuotaUser
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

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        appointmentsUsed={trialAptsUsed}
        appointmentsLimit={trialAptsLimit}
        messagesUsed={trialMsgsUsed}
        messagesLimit={trialMsgsLimit}
        estimatedValue={estimatedValue}
        onSelectPlan={(plan) => handleCheckout(plan)}
        checkoutLoading={checkoutLoading}
      />
    </div>
  );
};

export default MyAccount;
