import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerId } from "@/hooks/useOwnerId";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingData, INITIAL_DATA } from "@/types/onboarding";
import { useAppointments } from "@/hooks/useAppointments";
import { useWhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { useSubscription } from "@/hooks/useSubscription";
import { STRIPE_PLANS } from "@/config/stripe";
import type { Appointment } from "@/types/appointment";
import {
  CalendarDays,
  Clock,
  Users,
  Loader2,
  Timer,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Zap,
  Bot,
  ArrowRight,
  UserX,
  Crown,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInMinutes, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TrialBanner from "@/components/dashboard/TrialBanner";
import WhatsAppStatusBadge from "@/components/dashboard/WhatsAppStatusBadge";
import InactiveClientsCard from "@/components/dashboard/InactiveClientsCard";
import NoShowMetricsCard from "@/components/dashboard/NoShowMetricsCard";
import WinbackMetricsCard from "@/components/dashboard/WinbackMetricsCard";

const Dashboard = () => {
  const { user } = useAuth();
  const { ownerId } = useOwnerId();
  const navigate = useNavigate();
  const { status: whatsappStatus, provider: whatsappProvider } = useWhatsAppStatus();
  const { status: subStatus, trialEndAt, plan: currentPlan } = useSubscription();

  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [now, setNow] = useState(new Date());

  const {
    appointments,
    loading: loadingApts,
  } = useAppointments();

  // Tick every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Load config
  useEffect(() => {
    const load = async () => {
      if (!ownerId) return;
      const { data: configs } = await supabase
        .from("pet_shop_configs")
        .select("*")
        .eq("user_id", ownerId)
        .limit(1);

      if (configs && configs.length > 0) {
        const c = configs[0];
        setData({
          phone: c.phone,
          phoneVerified: c.phone_verified,
          niche: (c as any).niche ?? "petshop",
          shopName: c.shop_name,
          address: c.address,
          neighborhood: c.neighborhood,
          city: c.city,
          state: c.state,
          businessHours: c.business_hours as unknown as OnboardingData["businessHours"],
          services: c.services as unknown as OnboardingData["services"],
          voiceTone: c.voice_tone as OnboardingData["voiceTone"],
          assistantName: c.assistant_name,
          maxConcurrentAppointments: (c as any).max_concurrent_appointments ?? 1,
          attendants: (c as any).attendants ?? [""],
        });

        // Ensure subscription exists
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", ownerId)
          .maybeSingle();
        if (!sub) {
          await supabase.from("subscriptions").insert({ user_id: ownerId, status: "active" });
        }
      }
      setLoadingConfig(false);
    };
    load();
  }, [ownerId]);

  const todayStr = now.toISOString().split("T")[0];
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  // Greeting
  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, [now]);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || data.shopName || "Usuário";

  // ──── Stats ────
  const todayApts = useMemo(
    () => appointments.filter((a) => a.date === todayStr && a.status !== "cancelled"),
    [appointments, todayStr]
  );
  const confirmedToday = todayApts.filter((a) => a.status === "confirmed" || a.status === "completed").length;
  const pendingToday = todayApts.filter((a) => a.status === "pending").length;
  const cancelledToday = appointments.filter((a) => a.date === todayStr && a.status === "cancelled").length;

  // Revenue
  const priceMap = useMemo(() => new Map(data.services.map((s) => [s.name, s.price])), [data.services]);
  const getPrice = (name: string) => priceMap.get(name) ?? 0;

  const { revenueToday, revenueMonth, ticketMedio, cancelledMonthValue } = useMemo(() => {
    const completedApts = appointments.filter((a) => a.status === "completed");
    const cToday = completedApts.filter((a) => a.date === todayStr);
    const cMonth = completedApts.filter((a) => a.date >= monthStart && a.date <= monthEnd);

    const rToday = cToday.reduce((sum, a) => sum + getPrice(a.service), 0);
    const rMonth = cMonth.reduce((sum, a) => sum + getPrice(a.service), 0);
    const ticket = cMonth.length > 0 ? rMonth / cMonth.length : 0;

    const cancelledMonth = appointments
      .filter((a) => a.status === "cancelled" && a.date >= monthStart && a.date <= monthEnd)
      .reduce((sum, a) => sum + getPrice(a.service), 0);

    return { revenueToday: rToday, revenueMonth: rMonth, ticketMedio: ticket, cancelledMonthValue: cancelledMonth };
  }, [appointments, todayStr, monthStart, monthEnd, priceMap]);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Next appointment
  const getMinutesUntil = (apt: Appointment) => {
    try {
      return differenceInMinutes(new Date(`${apt.date}T${apt.time}`), now);
    } catch {
      return Infinity;
    }
  };

  const nextAppointment = useMemo(() => {
    return appointments
      .filter((a) => a.status !== "cancelled" && a.status !== "completed" && a.date >= todayStr)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
      .find((a) => getMinutesUntil(a) > -30);
  }, [appointments, now, todayStr]);

  const formatCountdown = (minutes: number) => {
    if (minutes < 0) return "Agora";
    if (minutes < 60) return `em ${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `em ${h}h${m}min` : `em ${h}h`;
  };

  // Unique conversations count (distinct phones from conversation_messages)
  const [conversationsMonth, setConversationsMonth] = useState(0);
  const [totalMessagesMonth, setTotalMessagesMonth] = useState(0);
  useEffect(() => {
    if (!ownerId) return;
    const fetchConvos = async () => {
      const [convoRes, msgCountRes] = await Promise.all([
        supabase
          .from("conversation_messages")
          .select("phone")
          .eq("user_id", ownerId)
          .gte("created_at", `${monthStart}T00:00:00`)
          .lte("created_at", `${monthEnd}T23:59:59`),
        supabase
          .from("conversation_messages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", ownerId)
          .gte("created_at", `${monthStart}T00:00:00`)
          .lte("created_at", `${monthEnd}T23:59:59`),
      ]);
      const uniquePhones = new Set(convoRes.data?.map((m) => m.phone) ?? []);
      setConversationsMonth(uniquePhones.size);
      setTotalMessagesMonth(msgCountRes.count ?? 0);
    };
    fetchConvos();
  }, [ownerId, monthStart, monthEnd]);

  // Plan limit based on actual plan
  const planKey = (currentPlan === "professional" ? "professional" : "starter") as keyof typeof STRIPE_PLANS;
  const planLimit = STRIPE_PLANS[planKey].limit;
  const planName = subStatus === "active" ? STRIPE_PLANS[planKey].name : subStatus === "cancelled" ? "Cancelado" : "Sem plano";
  const messagesPercent = planLimit > 0 ? (totalMessagesMonth / planLimit) * 100 : 0;

  // Trial quota info from subscription context
  const {
    trialAppointmentsUsed, trialAppointmentsLimit,
    trialMessagesUsed, trialMessagesLimit,
  } = useSubscription();

  if (loadingConfig || loadingApts) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* ─── Trial Banner ─── */}
      <TrialBanner />

      {/* ─── WhatsApp Connection Banner ─── */}
      {whatsappStatus !== "connected" && ownerId === user?.id && (
        <Card className="border-none shadow-lg bg-gradient-to-r from-primary/15 via-primary/5 to-transparent overflow-hidden">
          <CardContent className="py-5 px-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">Conecte seu WhatsApp</p>
                  <p className="text-sm text-muted-foreground">
                    Sua secretária <span className="font-semibold text-primary">{data.assistantName}</span> está pronta! Conecte o WhatsApp para começar a atender automaticamente.
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <WhatsAppStatusBadge />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 1. Hero Section ─── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {greeting}, {firstName} 👋
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Bot className={`w-4 h-4 ${whatsappStatus === "connected" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm text-muted-foreground">
                Secretária <span className={`font-semibold ${whatsappStatus === "connected" ? "text-primary" : "text-destructive"}`}>{data.assistantName}</span> {whatsappStatus === "connected" ? "ativa" : "inativa"}
              </span>
              <span className={`w-2 h-2 rounded-full ${whatsappStatus === "connected" ? "bg-success animate-pulse" : "bg-destructive"}`} />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/appointments")} className="gap-2 self-start">
            <CalendarDays className="w-4 h-4" />
            Ver agenda completa
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Next appointment hero card */}
        {nextAppointment ? (
          <Card className="border-none shadow-lg bg-gradient-to-br from-primary/15 via-primary/5 to-transparent overflow-hidden">
            <CardContent className="py-5 px-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Timer className="w-7 h-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Próximo atendimento</p>
                <p className="text-lg font-bold truncate">{nextAppointment.owner_name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {nextAppointment.service} · {nextAppointment.pet_name}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-3xl font-bold tabular-nums text-primary">{nextAppointment.time.slice(0, 5)}</p>
                <p className="text-sm font-semibold text-accent">{formatCountdown(getMinutesUntil(nextAppointment))}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-md bg-muted/30">
            <CardContent className="py-8 text-center">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum atendimento próximo</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ─── 2. Resumo do Dia ─── */}
      <section>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Resumo do dia</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { value: todayApts.length, label: "Atendimentos hoje", icon: CalendarDays, color: "text-primary", bg: "bg-primary/10" },
            { value: confirmedToday, label: "Confirmados", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
            { value: pendingToday, label: "Pendentes", icon: Clock, color: "text-accent", bg: "bg-accent/10" },
            { value: cancelledToday, label: "Faltas", icon: UserX, color: "text-destructive", bg: "bg-destructive/10", alert: cancelledToday > 0 },
          ].map((stat) => (
            <Card
              key={stat.label}
              className={`border-none shadow-md ${stat.alert ? "ring-1 ring-destructive/30 bg-destructive/5" : "bg-card"}`}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── 3. Bloco Automação WhatsApp ─── */}
      <section>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
          🤖 Sua Secretária Digital{data.assistantName ? ` · ${data.assistantName}` : ""}
        </h2>
        <Card className="border-none shadow-md bg-card">
          <CardContent className="py-5 px-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{conversationsMonth}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Conversas no mês
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground/60 hover:text-primary transition-colors">
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="text-xs max-w-[220px] p-3">
                        Quantidade de clientes diferentes (números únicos) que enviaram mensagens para sua secretária neste mês.
                      </PopoverContent>
                    </Popover>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold">100%</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Respostas automáticas
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground/60 hover:text-primary transition-colors">
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="text-xs max-w-[220px] p-3">
                        Percentual de mensagens respondidas automaticamente pela IA, sem necessidade de intervenção humana.
                      </PopoverContent>
                    </Popover>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xl font-bold">&lt;1s</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Tempo de resposta
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground/60 hover:text-primary transition-colors">
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="text-xs max-w-[220px] p-3">
                        Tempo médio que a secretária digital leva para responder cada mensagem recebida.
                      </PopoverContent>
                    </Popover>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    whatsappStatus === "connected" ? "bg-success/10" : "bg-destructive/10"
                  }`}
                >
                  <Zap
                    className={`w-5 h-5 ${whatsappStatus === "connected" ? "text-success" : "text-destructive"}`}
                  />
                </div>
                <div>
                  <p className={`text-sm font-bold ${whatsappStatus === "connected" ? "text-success" : "text-destructive"}`}>
                    {whatsappStatus === "connected"
                      ? whatsappProvider === "meta" ? "Conectado (Meta)" : "Conectado"
                      : "Desconectado"}
                  </p>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  {whatsappStatus !== "connected" && (
                    <p className="text-xs text-destructive font-medium">Não conectado</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── 4. Bloco Financeiro ─── */}
      <section>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Financeiro</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { value: formatCurrency(revenueToday), label: "Faturamento hoje", icon: DollarSign, color: "text-success", bg: "bg-success/10" },
            { value: formatCurrency(revenueMonth), label: "Faturamento do mês", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
            { value: formatCurrency(ticketMedio), label: "Ticket médio", icon: Users, color: "text-accent", bg: "bg-accent/10" },
            ...(cancelledMonthValue > 0
              ? [{ value: formatCurrency(cancelledMonthValue), label: "Perdido com faltas", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", alert: true }]
              : []),
          ].map((stat) => (
            <Card
              key={stat.label}
              className={`border-none shadow-md ${stat.alert ? "ring-1 ring-destructive/20 bg-destructive/5" : "bg-card"}`}
            >
              <CardContent className="pt-4 pb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-2`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className={`text-lg font-bold ${stat.alert ? "text-destructive" : ""}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── No-Show Recovery ─── */}
      <NoShowMetricsCard />

      {/* ─── Win-back Campaign (Pro only) ─── */}
      <WinbackMetricsCard />

      {/* ─── Clientes Inativos ─── */}
      <InactiveClientsCard />

      {/* ─── 5. Cotas disponíveis (hidden for professionals) ─── */}
      {ownerId === user?.id && (
      <section>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Seus recursos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Appointments quota */}
          <Card className="border-none shadow-md bg-card">
            <CardContent className="py-5 px-5 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Clientes agendados pela IA</span>
              </div>
              {trialAppointmentsLimit === -1 ? (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="text-success font-semibold">Ilimitados</span>
                  <span className="font-bold text-foreground">{trialAppointmentsUsed} agendamentos</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.max(0, trialAppointmentsLimit - trialAppointmentsUsed)} agendamentos disponíveis</span>
                    <span className="font-bold text-foreground">{trialAppointmentsUsed}/{trialAppointmentsLimit}</span>
                  </div>
                  <Progress
                    value={Math.min(trialAppointmentsLimit > 0 ? (trialAppointmentsUsed / trialAppointmentsLimit) * 100 : 0, 100)}
                    className={`h-2.5 ${(trialAppointmentsUsed / trialAppointmentsLimit) * 100 >= 80 ? "[&>div]:bg-accent" : ""}`}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Messages quota */}
          <Card className="border-none shadow-md bg-card">
            <CardContent className="py-5 px-5 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Mensagens atendidas pela IA</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.max(0, trialMessagesLimit - trialMessagesUsed)} mensagens disponíveis</span>
                <span className="font-bold text-foreground">{trialMessagesUsed}/{trialMessagesLimit}</span>
              </div>
              <Progress
                value={Math.min(trialMessagesLimit > 0 ? (trialMessagesUsed / trialMessagesLimit) * 100 : 0, 100)}
                className={`h-2.5 ${(trialMessagesUsed / trialMessagesLimit) * 100 >= 80 ? "[&>div]:bg-accent" : ""}`}
              />
            </CardContent>
          </Card>
        </div>
      </section>
      )}
    </div>
  );
};

export default Dashboard;
