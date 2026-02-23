import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingData, INITIAL_DATA } from "@/types/onboarding";
import { useAppointments } from "@/hooks/useAppointments";
import AppointmentDialog from "@/components/dashboard/AppointmentDialog";
import type { Appointment } from "@/types/appointment";
import {
  CalendarDays,
  Clock,
  Scissors,
  Users,
  Bot,
  Loader2,
  PawPrint,
  Pencil,
  Trash2,
  CheckCircle2,
  Bell,
  BellOff,
  Zap,
  Timer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
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

const STATUS_MAP: Record<string, { label: string; dotClass: string; bgClass: string; textClass: string }> = {
  pending: { label: "Pendente", dotClass: "bg-accent", bgClass: "bg-accent/15", textClass: "text-accent font-semibold" },
  confirmed: { label: "Confirmado", dotClass: "bg-success", bgClass: "bg-success/15", textClass: "text-success font-semibold" },
  completed: { label: "Concluído", dotClass: "bg-primary", bgClass: "bg-primary/15", textClass: "text-primary font-semibold" },
  cancelled: { label: "Cancelado", dotClass: "bg-destructive", bgClass: "bg-destructive/15", textClass: "text-destructive font-semibold" },
};

type StatFilter = "today" | "confirmed" | "pending" | "total" | null;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatFilter>(null);
  const {
    appointments,
    loading: loadingApts,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments();

  const todayStrForCounts = new Date().toISOString().split("T")[0];
  const todayCount = appointments.filter((a) => a.date === todayStrForCounts && a.status !== "cancelled").length;
  const confirmedCount = appointments.filter((a) => a.status === "confirmed" || a.status === "completed").length;
  const pendingCount = appointments.filter((a) => a.status === "pending").length;

  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  // Update "now" every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

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

        // Ensure subscription exists (covers case where onboarding activation failed)
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

  // Helper: get minutes until appointment
  const getMinutesUntil = (apt: Appointment) => {
    try {
      const aptDate = new Date(`${apt.date}T${apt.time}`);
      return differenceInMinutes(aptDate, now);
    } catch {
      return Infinity;
    }
  };

  // Next upcoming appointment
  const nextAppointment = useMemo(() => {
    const todayStr = now.toISOString().split("T")[0];
    return appointments
      .filter((a) => a.status !== "cancelled" && a.status !== "completed" && a.date >= todayStr)
      .sort((a, b) => {
        const da = `${a.date}T${a.time}`;
        const db = `${b.date}T${b.time}`;
        return da.localeCompare(db);
      })
      .find((a) => getMinutesUntil(a) > -30); // not already 30min past
  }, [appointments, now]);

  // Filtered appointments list
  const upcomingAppointments = useMemo(() => {
    let list = appointments.filter((a) => a.status !== "cancelled" && a.status !== "completed");

    const todayStr = now.toISOString().split("T")[0];

    if (activeFilter === "today") {
      list = list.filter((a) => a.date === todayStr);
    } else if (activeFilter === "confirmed") {
      list = list.filter((a) => a.status === "confirmed");
    } else if (activeFilter === "pending") {
      list = list.filter((a) => a.status === "pending");
    }
    // "total" = no extra filter

    return list.sort((a, b) => {
      const da = `${a.date}T${a.time}`;
      const db = `${b.date}T${b.time}`;
      return da.localeCompare(db);
    });
  }, [appointments, activeFilter, now]);

  // Split into today / upcoming
  const todayStr = now.toISOString().split("T")[0];
  const todayAppointments = upcomingAppointments.filter((a) => a.date === todayStr);
  const futureAppointments = upcomingAppointments.filter((a) => a.date > todayStr);

  if (loadingConfig || loadingApts) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const openDays = data.businessHours.filter((d) => d.isOpen).length;
  const toneLabel = data.voiceTone === "friendly" ? "Amigável" : data.voiceTone === "fun" ? "Divertido" : "Formal";

  const handleDelete = async (id: string) => {
    const { error } = await deleteAppointment(id);
    if (!error) toast({ title: "Agendamento removido" });
  };

  const handleStatusToggle = async (apt: Appointment) => {
    const newStatus = apt.status === "pending" ? "confirmed" : apt.status === "confirmed" ? "completed" : "pending";
    await updateAppointment(apt.id, { status: newStatus });
  };

  const formatDate = (dateStr: string) => {
    try {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      if (dateStr === todayStr) return "Hoje";
      if (dateStr === tomorrow) return "Amanhã";
      return format(new Date(dateStr + "T12:00:00"), "EEE, dd/MM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatCountdown = (minutes: number) => {
    if (minutes < 0) return "Agora";
    if (minutes < 60) return `em ${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `em ${h}h${m}min` : `em ${h}h`;
  };

  const toggleFilter = (filter: StatFilter) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  };

  const statCards = [
    { key: "today" as StatFilter, value: todayCount, label: "Hoje", icon: CalendarDays, colorClass: "text-primary", bgClass: "bg-primary/10" },
    { key: "confirmed" as StatFilter, value: confirmedCount, label: "Confirmados", icon: CheckCircle2, colorClass: "text-success", bgClass: "bg-success/10" },
    { key: "pending" as StatFilter, value: pendingCount, label: "Pendentes", icon: Clock, colorClass: "text-accent", bgClass: "bg-accent/10" },
    { key: "total" as StatFilter, value: appointments.length, label: "Total", icon: Users, colorClass: "text-primary", bgClass: "bg-primary/10" },
  ];

  const renderAppointmentRow = (apt: Appointment) => {
    const statusInfo = STATUS_MAP[apt.status] ?? STATUS_MAP.pending;
    const minutesUntil = getMinutesUntil(apt);
    const isUrgent = minutesUntil >= 0 && minutesUntil <= 60 && apt.date === todayStr;

    return (
      <div
        key={apt.id}
        className={`flex items-center justify-between p-3 rounded-xl transition-colors group ${
          isUrgent
            ? "bg-accent/10 border border-accent/30 ring-1 ring-accent/20"
            : "bg-secondary hover:bg-secondary/80"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => handleStatusToggle(apt)}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              isUrgent ? "bg-accent/20 hover:bg-accent/30" : "bg-primary/10 hover:bg-primary/20"
            }`}
            title="Alterar status"
          >
            {isUrgent ? (
              <Zap className="w-4 h-4 text-accent" />
            ) : (
              <PawPrint className="w-4 h-4 text-primary" />
            )}
          </button>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{apt.pet_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {apt.owner_name} · {apt.service}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {apt.confirmation_message_sent_at ? (
            <span title={`Lembrete enviado em ${format(new Date(apt.confirmation_message_sent_at), "dd/MM HH:mm")}`}>
              <Bell className="w-3.5 h-3.5 text-success" />
            </span>
          ) : (
            <span title="Lembrete ainda não enviado">
              <BellOff className="w-3.5 h-3.5 text-muted-foreground/40" />
            </span>
          )}
          <div className="text-right mr-1">
            <p className="text-base font-bold tabular-nums">{apt.time.slice(0, 5)}</p>
            <div className="flex items-center gap-1.5 justify-end">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusInfo.bgClass} ${statusInfo.textClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                {statusInfo.label}
              </span>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setEditingApt(apt);
                setEditDialogOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover agendamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O agendamento de {apt.pet_name} será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(apt.id)}>
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <PawPrint className="w-7 h-7 text-primary" />
            {data.shopName || "Meu Pet Shop"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Secretária <span className="font-semibold text-primary">{data.assistantName}</span> está ativa
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <AppointmentDialog services={data.services} onSave={addAppointment} />
          <Button variant="outline" onClick={() => navigate("/settings")}>
            Configurações
          </Button>
        </div>
      </div>

      {/* Next Appointment Hero */}
      {nextAppointment && (
        <Card className="border-none shadow-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent overflow-hidden">
          <CardContent className="py-5 px-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Timer className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Próximo atendimento</p>
              <p className="text-lg font-bold truncate">{nextAppointment.owner_name} — {nextAppointment.pet_name}</p>
              <p className="text-sm text-muted-foreground truncate">{nextAppointment.service}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold tabular-nums text-primary">{nextAppointment.time.slice(0, 5)}</p>
              <p className="text-xs font-semibold text-accent">
                {formatCountdown(getMinutesUntil(nextAppointment))}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats - clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card
            key={stat.key}
            className={`border-none shadow-md cursor-pointer transition-all ${
              activeFilter === stat.key
                ? "ring-2 ring-primary shadow-lg scale-[1.02]"
                : "bg-card hover:shadow-lg"
            }`}
            onClick={() => toggleFilter(stat.key)}
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bgClass} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.colorClass}`} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments list */}
        <Card className="border-none shadow-md bg-card lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Agendamentos
                {activeFilter && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({upcomingAppointments.length} {activeFilter === "today" ? "hoje" : activeFilter === "confirmed" ? "confirmados" : activeFilter === "pending" ? "pendentes" : "total"})
                  </span>
                )}
              </CardTitle>
              {activeFilter && (
                <Button variant="ghost" size="sm" onClick={() => setActiveFilter(null)} className="text-xs h-7">
                  Limpar filtro
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PawPrint className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum agendamento</p>
                <p className="text-sm">Clique em "Novo Agendamento" para começar</p>
              </div>
            ) : (
              <>
                {/* Today section */}
                {todayAppointments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Hoje — {format(now, "dd 'de' MMMM", { locale: ptBR })}
                    </h3>
                    {todayAppointments.map(renderAppointmentRow)}
                  </div>
                )}

                {/* Future section */}
                {futureAppointments.length > 0 && (
                  <div className="space-y-2">
                    {todayAppointments.length > 0 && (
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2">
                        Próximos
                      </h3>
                    )}
                    {futureAppointments.map((apt) => (
                      <div key={apt.id}>
                        <p className="text-[11px] text-muted-foreground mb-1 ml-1">{formatDate(apt.date)}</p>
                        {renderAppointmentRow(apt)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

      {/* Config summary */}
          <div className="space-y-6">
          {/* Sua Secretária */}
          <Card className="border-none shadow-md bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Bot className="w-5 h-5 text-accent" />
                Sua Secretária
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-xl bg-secondary">
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-semibold">{data.assistantName}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary">
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="font-semibold">{data.phone}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary flex items-start gap-2">
                <Clock className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Funcionamento</p>
                  <p className="font-semibold text-sm">{openDays} dias/semana</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-secondary flex items-start gap-2">
                <Scissors className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Serviços</p>
                  <p className="font-semibold text-sm">{data.services.length} cadastrados</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-secondary">
                <p className="text-xs text-muted-foreground">Tom de voz</p>
                <p className="font-semibold">{toneLabel}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit dialog */}
      {editingApt && (
        <AppointmentDialog
          services={data.services}
          onSave={addAppointment}
          editingAppointment={editingApt}
          onUpdate={updateAppointment}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingApt(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
