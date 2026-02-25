import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS, StripePlanKey } from "@/config/stripe";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  MessageSquare,
  CalendarDays,
  Shield,
  Clock,
  Bot,
  Crown,
  Loader2,
  Check,
  Star,
  Lock,
  LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const UpgradeRequired = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { phase, daysOverdue } = useTrialStatus();
  const { toast } = useToast();

  const [stats, setStats] = useState({ messages: 0, appointments: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [msgRes, aptRes] = await Promise.all([
        supabase
          .from("conversation_messages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      setStats({
        messages: msgRes.count ?? 0,
        appointments: aptRes.count ?? 0,
      });
      setLoadingStats(false);
    };
    load();
  }, [user]);

  const handleCheckout = async (planKey: StripePlanKey) => {
    setCheckoutLoading(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planKey },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e: any) {
      toast({ title: "Erro ao iniciar pagamento", description: e.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const isBlocked = phase === "blocked";
  const isGrace = phase === "grace_period";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {isBlocked ? "Acesso bloqueado" : "Seu período de teste expirou"}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {isBlocked
              ? "Seu período de tolerância de 3 dias acabou. Ative um plano para continuar usando o sistema."
              : `Você tem ${3 - daysOverdue} dia${3 - daysOverdue !== 1 ? "s" : ""} restante${3 - daysOverdue !== 1 ? "s" : ""} no período de tolerância. Ative agora!`}
          </p>
        </div>

        {/* User stats */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4">
              Seu progresso durante o trial
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.messages}
                  </p>
                  <p className="text-xs text-muted-foreground">Mensagens processadas</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.appointments}
                  </p>
                  <p className="text-xs text-muted-foreground">Agendamentos criados</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card>
          <CardContent className="py-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4">
              O que você ganha ao ativar
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: Bot, label: "Secretária IA 24/7", desc: "Atendimento automático inteligente" },
                { icon: CalendarDays, label: "Agendamento automático", desc: "Seus clientes agendam pelo WhatsApp" },
                { icon: Shield, label: "Confirmação automática", desc: "Reduz faltas com lembretes" },
                { icon: Clock, label: "Resposta em <1s", desc: "Nunca perca um cliente por demora" },
              ].map((b) => (
                <div key={b.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <b.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{b.label}</p>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Starter */}
          <Card className="border-2 border-muted">
            <CardContent className="p-5 flex flex-col h-full">
              <Badge className="w-fit mb-2 bg-destructive text-destructive-foreground text-xs">🔥 Fundador</Badge>
              <h3 className="font-display font-bold text-lg">Starter</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold">R$ {STRIPE_PLANS.starter.price}</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <ul className="space-y-1.5 mb-4 flex-1 text-sm mt-3">
                {["1 número WhatsApp", "Até 1.000 msgs/mês", "Respostas automáticas", "Suporte padrão"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleCheckout("starter")}
                disabled={checkoutLoading === "starter"}
              >
                {checkoutLoading === "starter" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Ativar Starter
              </Button>
            </CardContent>
          </Card>

          {/* Professional */}
          <Card className="border-2 border-primary shadow-lg scale-[1.02]">
            <CardContent className="p-5 flex flex-col h-full">
              <Badge className="w-fit mb-2 bg-primary text-primary-foreground text-xs">⭐ Mais Popular</Badge>
              <h3 className="font-display font-bold text-lg">Profissional</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold">R$ {STRIPE_PLANS.professional.price}</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <ul className="space-y-1.5 mb-4 flex-1 text-sm mt-3">
                {["Tudo do Starter +", "Até 3.000 msgs/mês", "IA personalizada", "Suporte prioritário"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full font-bold"
                onClick={() => handleCheckout("professional")}
                disabled={checkoutLoading === "professional"}
              >
                {checkoutLoading === "professional" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Star className="w-4 h-4 mr-2" />}
                Ativar Profissional
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          💳 Pagamento seguro via Stripe • Cartão de crédito ou boleto bancário
        </p>

        <div className="text-center">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground gap-2"
            onClick={async () => {
              await supabase.auth.signOut({ scope: "local" });
              navigate("/");
            }}
          >
            <LogOut className="w-4 h-4" />
            Sair e trocar de conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeRequired;
