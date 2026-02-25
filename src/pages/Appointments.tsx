import { useState, useMemo, useEffect } from "react";
import { CalendarDays, Plus, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAppointments } from "@/hooks/useAppointments";
import { useNiche } from "@/hooks/useNiche";
import AppointmentDialog from "@/components/dashboard/AppointmentDialog";
import type { Appointment } from "@/types/appointment";
import type { Service } from "@/types/onboarding";
import { isSameDay, parseISO, addDays, startOfWeek, endOfWeek, endOfMonth, isWithinInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import AppointmentStatsBar from "@/components/appointments/AppointmentStatsBar";
import AppointmentFilters, { type ViewMode } from "@/components/appointments/AppointmentFilters";
import AppointmentListView from "@/components/appointments/AppointmentListView";
import AppointmentCalendarView from "@/components/appointments/AppointmentCalendarView";
import AvailabilityCard from "@/components/appointments/AvailabilityCard";
import type { DaySchedule } from "@/types/onboarding";


const Appointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPetNiche } = useNiche();
  const {
    appointments,
    loading: loadingApts,
    loadingMore,
    hasMore,
    totalCount,
    loadMore,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments();

  const [services, setServices] = useState<Service[]>([]);
  const [businessHours, setBusinessHours] = useState<DaySchedule[]>([]);
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickDateFilter, setQuickDateFilter] = useState("all");
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
        setBusinessHours(configs[0].business_hours as unknown as DaySchedule[]);
        setMaxConcurrent((configs[0] as any).max_concurrent_appointments ?? 1);
      }
      setLoadingConfig(false);
    };
    load();
  }, [user]);

  const handleQuickDateFilter = (filter: string) => {
    setQuickDateFilter(filter);
    setSelectedDate(undefined);
  };

  const filteredAppointments = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const tomorrowStr = addDays(today, 1).toISOString().split("T")[0];
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    return appointments.filter((apt) => {
      // Quick date filter
      if (quickDateFilter === "today" && apt.date !== todayStr) return false;
      if (quickDateFilter === "tomorrow" && apt.date !== tomorrowStr) return false;
      if (quickDateFilter === "week") {
        const aptDate = parseISO(apt.date);
        if (!isWithinInterval(aptDate, { start: today, end: weekEnd })) return false;
      }
      if (quickDateFilter === "month") {
        const aptDate = parseISO(apt.date);
        const monthEnd = endOfMonth(today);
        if (!isWithinInterval(aptDate, { start: today, end: monthEnd })) return false;
      }

      // Selected date
      if (selectedDate && !isSameDay(parseISO(apt.date), selectedDate)) return false;

      // Status
      if (statusFilter !== "all" && apt.status !== statusFilter) return false;

      // Service
      if (serviceFilter !== "all" && apt.service !== serviceFilter) return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !apt.owner_name.toLowerCase().includes(q) &&
          !apt.pet_name.toLowerCase().includes(q) &&
          !apt.service.toLowerCase().includes(q)
        ) return false;
      }

      return true;
    });
  }, [appointments, quickDateFilter, selectedDate, statusFilter, serviceFilter, searchQuery]);

  const uniqueServices = useMemo(() => {
    return Array.from(new Set(appointments.map((a) => a.service)));
  }, [appointments]);

  const hasActiveFilters = selectedDate !== undefined || statusFilter !== "all" || serviceFilter !== "all" || searchQuery !== "" || quickDateFilter !== "all";

  const clearFilters = () => {
    setSelectedDate(undefined);
    setStatusFilter("all");
    setServiceFilter("all");
    setSearchQuery("");
    setQuickDateFilter("all");
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteAppointment(id);
    if (!error) toast({ title: "Agendamento removido" });
  };

  const handleStatusChange = async (id: string, status: Appointment["status"]) => {
    await updateAppointment(id, { status });
  };

  const handleEdit = (apt: Appointment) => {
    setEditingApt(apt);
    setEditDialogOpen(true);
  };

  if (loadingConfig || loadingApts) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-primary" />
            Agendamentos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount !== null ? totalCount : appointments.length} total
            {appointments.length !== (totalCount ?? appointments.length) && (
              <span className="text-muted-foreground/70"> · {appointments.length} carregados</span>
            )}
            {filteredAppointments.length !== appointments.length && (
              <span className="text-primary font-medium"> · {filteredAppointments.length} filtrado{filteredAppointments.length !== 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
        <AppointmentDialog services={services} onSave={addAppointment} isPetNiche={isPetNiche} appointments={appointments} maxConcurrent={maxConcurrent} />
      </div>

      {/* Availability */}
      {businessHours.length > 0 && (
        <AvailabilityCard appointments={appointments} businessHours={businessHours} maxConcurrent={maxConcurrent} />
      )}

      {/* Stats */}
      <AppointmentStatsBar appointments={filteredAppointments} />

      {/* Filters */}
      <AppointmentFilters
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        serviceFilter={serviceFilter}
        onServiceFilterChange={setServiceFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        quickDateFilter={quickDateFilter}
        onQuickDateFilterChange={handleQuickDateFilter}
        selectedDate={selectedDate}
        onClearDate={() => setSelectedDate(undefined)}
        uniqueServices={uniqueServices}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {/* Content */}
      {viewMode === "list" && (
        <AppointmentListView
          appointments={filteredAppointments}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          hasActiveFilters={hasActiveFilters}
          isPetNiche={isPetNiche}
        />
      )}

      {viewMode === "calendar" && (
        <AppointmentCalendarView
          appointments={appointments}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          isPetNiche={isPetNiche}
          maxConcurrent={maxConcurrent}
        />
      )}


      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2 pb-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
            className="gap-2"
          >
            {loadingMore ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {loadingMore ? "Carregando..." : "Carregar agendamentos anteriores"}
          </Button>
        </div>
      )}

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
          isPetNiche={isPetNiche}
          appointments={appointments}
          maxConcurrent={maxConcurrent}
        />
      )}

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 md:hidden z-50">
        <AppointmentDialog
          services={services}
          onSave={addAppointment}
          isPetNiche={isPetNiche}
          appointments={appointments}
          maxConcurrent={maxConcurrent}
          trigger={
            <Button size="lg" className="rounded-full w-14 h-14 shadow-lg">
              <Plus className="w-6 h-6" />
            </Button>
          }
        />
      </div>
    </div>
  );
};

export default Appointments;
