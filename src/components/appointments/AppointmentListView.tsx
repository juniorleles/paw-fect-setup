import { useMemo } from "react";
import { PawPrint } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Appointment } from "@/types/appointment";
import AppointmentCard from "./AppointmentCard";

interface Props {
  appointments: Appointment[];
  onStatusChange: (id: string, status: Appointment["status"]) => void;
  onEdit: (apt: Appointment) => void;
  onDelete: (id: string) => void;
  hasActiveFilters: boolean;
}

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

const AppointmentListView = ({ appointments, onStatusChange, onEdit, onDelete, hasActiveFilters }: Props) => {
  const groupedAppointments = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    appointments.forEach((apt) => {
      const list = groups.get(apt.date) || [];
      list.push(apt);
      groups.set(apt.date, list);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [appointments]);

  if (appointments.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border/50 shadow-sm py-16">
        <div className="text-center text-muted-foreground">
          <PawPrint className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-display text-lg font-medium">Nenhum agendamento encontrado</p>
          <p className="text-sm mt-1">
            {hasActiveFilters ? "Tente ajustar os filtros" : "Clique em \"Novo Agendamento\" para começar"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedAppointments.map(([date, apts]) => (
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
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AppointmentListView;
