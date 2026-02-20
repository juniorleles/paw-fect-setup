import { useEffect, useState } from "react";
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
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Bell,
  BellOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import WhatsAppStatusBadge from "@/components/dashboard/WhatsAppStatusBadge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: "Pendente", class: "bg-accent/10 text-accent" },
  confirmed: { label: "Confirmado", class: "bg-success/10 text-success" },
  completed: { label: "Concluído", class: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelado", class: "bg-destructive/10 text-destructive" },
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const {
    appointments,
    loading: loadingApts,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    todayCount,
    confirmedCount,
    pendingCount,
  } = useAppointments();

  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
      }
      setLoadingConfig(false);
    };
    load();
  }, [user]);

  if (loadingConfig || loadingApts) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const openDays = data.businessHours.filter((d) => d.isOpen).length;
  const toneLabel = data.voiceTone === "friendly" ? "Amigável" : data.voiceTone === "fun" ? "Divertido" : "Formal";

  const upcomingAppointments = appointments.filter(
    (a) => a.status !== "cancelled" && a.status !== "completed"
  );

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
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      if (dateStr === today) return "Hoje";
      if (dateStr === tomorrow) return "Amanhã";
      return format(new Date(dateStr + "T12:00:00"), "dd/MM", { locale: ptBR });
    } catch {
      return dateStr;
    }
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
          <WhatsAppStatusBadge />
          <AppointmentDialog services={data.services} onSave={addAppointment} />
          <Button variant="outline" onClick={() => navigate("/settings")}>
            Configurações
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayCount}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{confirmedCount}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appointments.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments list */}
        <Card className="border-none shadow-md bg-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Agendamentos ({upcomingAppointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PawPrint className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum agendamento</p>
                <p className="text-sm">Clique em "Novo Agendamento" para começar</p>
              </div>
            ) : (
              upcomingAppointments.map((apt) => {
                const statusInfo = STATUS_MAP[apt.status] ?? STATUS_MAP.pending;
                return (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleStatusToggle(apt)}
                        className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 hover:bg-primary/20 transition-colors"
                        title="Alterar status"
                      >
                        <PawPrint className="w-4 h-4 text-primary" />
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
                        <p className="text-sm font-medium">{formatDate(apt.date)}, {apt.time.slice(0, 5)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.class}`}>
                          {statusInfo.label}
                        </span>
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
              })
            )}
          </CardContent>
        </Card>

        {/* Config summary */}
        <Card className="border-none shadow-md bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent" />
              Sua Secretária
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
