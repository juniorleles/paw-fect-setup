import { useState, useMemo } from "react";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAppointments } from "@/hooks/useAppointments";
import AppointmentDialog from "@/components/dashboard/AppointmentDialog";
import type { Appointment } from "@/types/appointment";
import type { OnboardingData, Service } from "@/types/onboarding";
import { INITIAL_DATA } from "@/types/onboarding";
import {
  CalendarDays,
  List,
  Filter,
  PawPrint,
  Loader2,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  X,
} from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
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

const STATUS_MAP: Record<string, { label: string; class: string; icon: typeof Clock }> = {
  pending: { label: "Pendente", class: "bg-accent/10 text-accent border-accent/20", icon: Clock },
  confirmed: { label: "Confirmado", class: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  completed: { label: "Concluído", class: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", class: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

type ViewMode = "list" | "calendar";

const Appointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    appointments,
    loading: loadingApts,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments();

  const [services, setServices] = useState<Service[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
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
        setServices(configs[0].services as unknown as Service[]);
      }
      setLoadingConfig(false);
    };
    load();
  }, [user]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (selectedDate && !isSameDay(parseISO(apt.date), selectedDate)) return false;
      if (statusFilter !== "all" && apt.status !== statusFilter) return false;
      if (serviceFilter !== "all" && apt.service !== serviceFilter) return false;
      return true;
    });
  }, [appointments, selectedDate, statusFilter, serviceFilter]);

  const uniqueServices = useMemo(() => {
    const set = new Set(appointments.map((a) => a.service));
    return Array.from(set);
  }, [appointments]);

  // Dates that have appointments (for calendar dots)
  const appointmentDates = useMemo(() => {
    const map = new Map<string, number>();
    appointments.forEach((a) => {
      map.set(a.date, (map.get(a.date) || 0) + 1);
    });
    return map;
  }, [appointments]);

  const hasActiveFilters = selectedDate || statusFilter !== "all" || serviceFilter !== "all";

  const clearFilters = () => {
    setSelectedDate(undefined);
    setStatusFilter("all");
    setServiceFilter("all");
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteAppointment(id);
    if (!error) toast({ title: "Agendamento removido" });
  };

  const handleStatusToggle = async (apt: Appointment) => {
    const newStatus = apt.status === "pending" ? "confirmed" : apt.status === "confirmed" ? "completed" : "pending";
    await updateAppointment(apt.id, { status: newStatus });
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      if (dateStr === today) return "Hoje";
      if (dateStr === tomorrow) return "Amanhã";
      return format(parseISO(dateStr), "EEEE, dd 'de' MMMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Group appointments by date
  const groupedAppointments = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    filteredAppointments.forEach((apt) => {
      const list = groups.get(apt.date) || [];
      list.push(apt);
      groups.set(apt.date, list);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAppointments]);

  if (loadingConfig || loadingApts) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-primary" />
            Agendamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            {appointments.length} agendamento{appointments.length !== 1 ? "s" : ""} no total
            {filteredAppointments.length !== appointments.length && (
              <span className="text-primary font-medium"> · {filteredAppointments.length} filtrado{filteredAppointments.length !== 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <AppointmentDialog services={services} onSave={addAppointment} />
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarDays className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-md bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filtros</span>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os serviços</SelectItem>
                  {uniqueServices.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedDate && (
                <Badge variant="secondary" className="h-9 px-3 flex items-center gap-1.5 text-sm">
                  {format(selectedDate, "dd/MM/yyyy")}
                  <button onClick={() => setSelectedDate(undefined)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <div className={`grid gap-6 ${viewMode === "calendar" ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
        {/* Calendar sidebar */}
        {viewMode === "calendar" && (
          <Card className="border-none shadow-md bg-card">
            <CardContent className="pt-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                className="pointer-events-auto"
                modifiers={{
                  hasAppointment: (date) => appointmentDates.has(format(date, "yyyy-MM-dd")),
                }}
                modifiersClassNames={{
                  hasAppointment: "bg-primary/15 font-bold text-primary",
                }}
              />
              <div className="mt-3 px-2 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary/15 inline-block" />
                  Dias com agendamentos
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appointments list */}
        <div className={viewMode === "calendar" ? "lg:col-span-2" : ""}>
          {filteredAppointments.length === 0 ? (
            <Card className="border-none shadow-md bg-card">
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <PawPrint className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-display text-lg font-medium">Nenhum agendamento encontrado</p>
                  <p className="text-sm mt-1">
                    {hasActiveFilters ? "Tente ajustar os filtros" : "Clique em \"Novo Agendamento\" para começar"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {groupedAppointments.map(([date, apts]) => (
                <div key={date}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 capitalize">
                    {formatDateLabel(date)}
                  </h3>
                  <Card className="border-none shadow-md bg-card">
                    <CardContent className="p-2 space-y-1">
                      {apts.map((apt) => {
                        const statusInfo = STATUS_MAP[apt.status] ?? STATUS_MAP.pending;
                        const StatusIcon = statusInfo.icon;
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
                              <div className="text-right mr-1">
                                <p className="text-sm font-medium">{apt.time.slice(0, 5)}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusInfo.class}`}>
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
                      })}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      {editingApt && (
        <AppointmentDialog
          services={services}
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

export default Appointments;
