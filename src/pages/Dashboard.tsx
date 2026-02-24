import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingData, INITIAL_DATA } from "@/types/onboarding";
import { useAppointments } from "@/hooks/useAppointments";
import { useWhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { useSubscription } from "@/hooks/useSubscription";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInMinutes, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const whatsappStatus = useWhatsAppStatus();
  const { status: subStatus } = useSubscription();

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
      if (!user) return;
      const { data: configs } = await supabase
        .from("pet_shop_configs")
        .select("*")
        .eq("user_id", user.id)
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
        });

        // Ensure subscription exists
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!sub) {
          await supabase.from("subscriptions").insert({ user_id: user.id, status: "active" });
        }
      }
      setLoadingConfig(false);
    };
    load();
  }, [user]);

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
  useEffect(() => {
    if (!user) return;
    const fetchConvos = async () => {
      const { data } = await supabase
        .from("conversation_messages")
        .select("phone")
        .eq("user_id", user.id)
        .gte("created_at", `${monthStart}T00:00:00`)
        .lte("created_at", `${monthEnd}T23:59:59`);
      const uniquePhones = new Set(data?.map((m) => m.phone) ?? []);
      setConversationsMonth(uniquePhones.size);
    };
    fetchConvos();
  }, [user, monthStart, monthEnd]);

  // Plan limit (hardcoded for now – 1000 free conversations)
  const planLimit = 1000;
  const planName = subStatus === "active" ? "Profissional" : subStatus === "cancelled" ? "Cancelado" : "Sem plano";

  if (loadingConfig || loadingApts) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* ─── 1. Hero Section ─── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {greeting}, {firstName} 👋
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Secretária <span className="font-semibold text-primary">{data.assistantName}</span> ativa
              </span>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
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
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Automação WhatsApp</h2>
        <Card className="border-none shadow-md bg-card">
          <CardContent className="py-5 px-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{conversationsMonth}</p>
                  <p className="text-xs text-muted-foreground">Conversas no mês</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold">100%</p>
                  <p className="text-xs text-muted-foreground">Respostas automáticas</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xl font-bold">&lt;1s</p>
                  <p className="text-xs text-muted-foreground">Tempo de resposta</p>
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
                    {whatsappStatus === "connected" ? "Conectado" : "Desconectado"}
                  </p>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  {whatsappStatus !== "connected" && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-destructive"
                      onClick={() => navigate("/settings")}
                    >
                      Reconectar
                    </Button>
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
          <Card className="border-none shadow-md bg-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{formatCurrency(revenueToday)}</p>
                  <p className="text-xs text-muted-foreground">Faturamento hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{formatCurrency(revenueMonth)}</p>
                  <p className="text-xs text-muted-foreground">Faturamento do mês</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{formatCurrency(ticketMedio)}</p>
                  <p className="text-xs text-muted-foreground">Ticket médio</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {cancelledMonthValue > 0 && (
            <Card className="border-none shadow-md bg-destructive/5 ring-1 ring-destructive/20">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold truncate text-destructive">{formatCurrency(cancelledMonthValue)}</p>
                    <p className="text-xs text-muted-foreground">Perdido com faltas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* ─── 5. Plano e Limites ─── */}
      <section>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Plano e limites</h2>
        <Card className="border-none shadow-md bg-card">
          <CardContent className="py-5 px-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold">{planName}</p>
                  <p className="text-xs text-muted-foreground">Plano atual</p>
                </div>
              </div>
              <div className="flex-1 max-w-md space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Conversas usadas</span>
                  <span className="font-semibold">
                    {conversationsMonth} / {planLimit.toLocaleString("pt-BR")}
                  </span>
                </div>
                <Progress value={Math.min((conversationsMonth / planLimit) * 100, 100)} className="h-2" />
              </div>
              <Button size="sm" className="gap-2 self-start sm:self-center" onClick={() => navigate("/settings")}>
                <Crown className="w-4 h-4" />
                Fazer upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;
