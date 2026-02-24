import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, addDays } from "date-fns";
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

interface UsageData {
  messages_used: number;
  messages_limit: number;
}

interface PaymentRecord {
  id: string;
  description: string;
  amount: number;
  status: string;
  paid_at: string | null;
}

const PLANS = {
  starter: { name: "Starter", price: 67, limit: 1000 },
  professional: { name: "Profissional", price: 167, limit: 3000 },
};

const MyAccount = () => {
  const { user } = useAuth();
  const { cancel, cancelling, reactivate, reactivating } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
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

      const subData = (subRes.data as unknown as SubscriptionData) ?? null;
      const currentPlanKey = (subData?.plan as keyof typeof PLANS) ?? "starter";
      const limit = PLANS[currentPlanKey]?.limit ?? PLANS.starter.limit;

      setSub(subData);
      setUsage({ messages_used: messagesRes.count ?? 0, messages_limit: limit });
      setPayments((payRes.data as unknown as PaymentRecord[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

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

  const trialEndDate = sub?.trial_end_at ? new Date(sub.trial_end_at) : null;
  const trialStartDate = sub?.trial_start_at ? new Date(sub.trial_start_at) : null;
  const trialDaysLeft = trialEndDate ? Math.max(0, differenceInDays(trialEndDate, now)) : 0;
  const trialTotalDays = 7;
  const trialDaysUsed = trialTotalDays - trialDaysLeft;
  const trialProgress = (trialDaysUsed / trialTotalDays) * 100;

  const currentPlan = (sub?.plan as keyof typeof PLANS) ?? "starter";
  const planInfo = PLANS[currentPlan] ?? PLANS.starter;

  const messagesUsed = usage?.messages_used ?? 0;
  const messagesLimit = usage?.messages_limit ?? planInfo.limit;
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
              </p>
            </div>
            {isTrialing && (
              <Button className="font-bold" onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}>
                <Zap className="w-4 h-4 mr-2" />
                Contratar plano agora
              </Button>
            )}
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
          <Card className={`border-2 ${currentPlan === "starter" ? "border-primary shadow-lg" : "border-transparent"}`}>
            <CardContent className="p-5 flex flex-col h-full">
              <Badge className="w-fit mb-2 bg-destructive text-destructive-foreground text-xs">🔥 Fundador</Badge>
              <h3 className="font-display font-bold text-lg">Starter</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold">R$ 67</span>
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
              {currentPlan === "starter" && !isCancelled ? (
                <Button variant="outline" disabled className="w-full">Plano atual</Button>
              ) : (
                <Button variant="outline" className="w-full">Assinar Starter</Button>
              )}
            </CardContent>
          </Card>

          {/* Profissional */}
          <Card className={`border-2 ${currentPlan === "professional" ? "border-primary shadow-lg" : "border-primary/50"} scale-[1.02]`}>
            <CardContent className="p-5 flex flex-col h-full">
              <Badge className="w-fit mb-2 bg-primary text-primary-foreground text-xs">⭐ Mais Popular</Badge>
              <h3 className="font-display font-bold text-lg">Profissional</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold">R$ 167</span>
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
              ) : currentPlan === "starter" ? (
                <Button className="w-full">
                  <Star className="w-4 h-4 mr-1" />
                  Fazer upgrade
                </Button>
              ) : (
                <Button className="w-full">Assinar Profissional</Button>
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
              <Button variant="outline" className="w-full">Entrar na lista de espera</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Forma de pagamento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Forma de pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sub?.payment_method ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 rounded bg-muted flex items-center justify-center text-xs font-bold">
                  {sub.payment_method === "pix" ? "PIX" : sub.payment_method === "card" ? "💳" : "📄"}
                </div>
                <span className="text-sm capitalize">{sub.payment_method === "pix" ? "PIX (recomendado)" : sub.payment_method === "card" ? "Cartão de crédito" : "Boleto"}</span>
              </div>
              <Button variant="outline" size="sm">Alterar</Button>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">Nenhuma forma de pagamento cadastrada</p>
              <Button variant="outline">
                <CreditCard className="w-4 h-4 mr-2" />
                Adicionar forma de pagamento
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
