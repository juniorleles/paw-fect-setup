import { useMemo, forwardRef, useCallback } from "react";
import { CalendarX } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GroupedVirtuoso } from "react-virtuoso";
import type { Appointment } from "@/types/appointment";
import AppointmentCard from "./AppointmentCard";

interface Props {
  appointments: Appointment[];
  onStatusChange: (id: string, status: Appointment["status"]) => void;
  onEdit: (apt: Appointment) => void;
  onDelete: (id: string) => void;
  hasActiveFilters: boolean;
  isPetNiche?: boolean;
}

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateLocal = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDateLabel = (dateStr: string) => {
  try {
    const now = new Date();
    const today = formatLocalDate(now);
    const tomorrow = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    if (dateStr === today) return "Hoje";
    if (dateStr === tomorrow) return "Amanhã";
    return format(parseDateLocal(dateStr), "EEEE, dd 'de' MMMM", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const VIRTUOSO_THRESHOLD = 50;

const AppointmentListView = forwardRef<HTMLDivElement, Props>(({ appointments, onStatusChange, onEdit, onDelete, hasActiveFilters, isPetNiche = true }, ref) => {
  const { groups, groupCounts, groupLabels, flatAppointments } = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();
    appointments.forEach((apt) => {
      const list = grouped.get(apt.date) || [];
      list.push(apt);
      grouped.set(apt.date, list);
    });
    // Sort each group by time
    grouped.forEach((apts) => apts.sort((a, b) => a.time.localeCompare(b.time)));
    const sorted = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
    return {
      groups: sorted,
      groupCounts: sorted.map(([, apts]) => apts.length),
      groupLabels: sorted.map(([date, apts]) => ({ date, count: apts.length })),
      flatAppointments: sorted.flatMap(([, apts]) => apts),
    };
  }, [appointments]);

  const renderGroupHeader = useCallback((index: number) => {
    const { date, count } = groupLabels[index];
    return (
      <div className="flex items-center gap-3 mb-3 pt-4 first:pt-0 bg-background sticky top-0 z-10 pb-1">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide capitalize">
          {formatDateLabel(date)}
        </h3>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
          {count}
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>
    );
  }, [groupLabels]);

  const renderItem = useCallback((index: number) => {
    const apt = flatAppointments[index];
    return (
      <div className="pb-2">
        <AppointmentCard
          appointment={apt}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onDelete={onDelete}
          isPetNiche={isPetNiche}
        />
      </div>
    );
  }, [flatAppointments, onStatusChange, onEdit, onDelete, isPetNiche]);

  if (appointments.length === 0) {
    return (
      <div ref={ref} className="bg-card rounded-xl border border-border/50 shadow-sm py-16">
        <div className="text-center text-muted-foreground">
          <CalendarX className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-display text-lg font-medium">Nenhum agendamento encontrado</p>
          <p className="text-sm mt-1">
            {hasActiveFilters ? "Tente ajustar os filtros" : "Clique em \"Novo Agendamento\" para começar"}
          </p>
        </div>
      </div>
    );
  }

  // Use simple rendering for small lists, virtuoso for large ones
  if (appointments.length < VIRTUOSO_THRESHOLD) {
    return (
      <div ref={ref} className="space-y-6">
        {groups.map(([date, apts]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide capitalize">
                {formatDateLabel(date)}
              </h3>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                {apts.length}
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
            <div className="space-y-2">
              {apts.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onStatusChange={onStatusChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isPetNiche={isPetNiche}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref}>
      <GroupedVirtuoso
        useWindowScroll
        groupCounts={groupCounts}
        groupContent={renderGroupHeader}
        itemContent={renderItem}
        overscan={200}
      />
    </div>
  );
});

AppointmentListView.displayName = "AppointmentListView";

export default AppointmentListView;
