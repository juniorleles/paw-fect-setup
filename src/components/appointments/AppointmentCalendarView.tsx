import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, parseISO, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Appointment } from "@/types/appointment";
import { STATUS_CONFIG } from "./AppointmentCard";

interface Props {
  appointments: Appointment[];
  onStatusChange: (id: string, status: Appointment["status"]) => void;
  onEdit: (apt: Appointment) => void;
  onDelete: (id: string) => void;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h to 20h

type CalendarSubView = "week" | "day";

const AppointmentCalendarView = ({
  appointments,
  onStatusChange,
  onEdit,
  onDelete,
  selectedDate,
  onSelectDate,
}: Props) => {
  const [subView, setSubView] = useState<CalendarSubView>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dayDate, setDayDate] = useState(new Date());

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const aptsByDayAndHour = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((apt) => {
      const hour = parseInt(apt.time.slice(0, 2));
      const key = `${apt.date}_${hour}`;
      const list = map.get(key) || [];
      list.push(apt);
      map.set(key, list);
    });
    return map;
  }, [appointments]);

  const todayStr = new Date().toISOString().split("T")[0];

  if (subView === "day") {
    const dayStr = format(dayDate, "yyyy-MM-dd");
    return (
      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        {/* Day header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <Button variant="ghost" size="icon" onClick={() => setDayDate((d) => addDays(d, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="font-display font-bold capitalize">
              {format(dayDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            <div className="flex gap-2 justify-center mt-1">
              <Button variant={"ghost"} size="sm" className="h-6 text-xs" onClick={() => setSubView("week")}>Semana</Button>
              <Button variant={"default"} size="sm" className="h-6 text-xs" onClick={() => setSubView("day")}>Dia</Button>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setDayDate((d) => addDays(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Timeline */}
        <div className="divide-y divide-border/30">
          {HOURS.map((hour) => {
            const key = `${dayStr}_${hour}`;
            const apts = aptsByDayAndHour.get(key) || [];
            return (
              <div key={hour} className="flex min-h-[60px]">
                <div className="w-16 flex-shrink-0 text-xs text-muted-foreground font-medium p-2 text-right border-r border-border/30">
                  {String(hour).padStart(2, "0")}:00
                </div>
                <div className="flex-1 p-1 space-y-1">
                  {apts.map((apt) => {
                    const status = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.pending;
                    return (
                      <button
                        key={apt.id}
                        onClick={() => onEdit(apt)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium truncate ${status.class} hover:opacity-80 transition-opacity`}
                      >
                        <span className="font-bold">{apt.time.slice(0, 5)}</span> {apt.owner_name} · {apt.pet_name} · {apt.service}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Week view
  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      {/* Week header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <p className="font-display font-bold text-sm">
            {format(weekStart, "dd MMM", { locale: ptBR })} – {format(addDays(weekStart, 6), "dd MMM yyyy", { locale: ptBR })}
          </p>
          <div className="flex gap-2 justify-center mt-1">
            <Button variant={"default"} size="sm" className="h-6 text-xs" onClick={() => setSubView("week")}>Semana</Button>
            <Button variant={"ghost"} size="sm" className="h-6 text-xs" onClick={() => setSubView("day")}>Dia</Button>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Week grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50">
            <div />
            {weekDays.map((day) => {
              const isToday = format(day, "yyyy-MM-dd") === todayStr;
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setDayDate(day);
                    setSubView("day");
                  }}
                  className={`text-center py-2 text-xs font-medium border-l border-border/30 hover:bg-muted/50 transition-colors ${
                    isToday ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground"
                  }`}
                >
                  <span className="capitalize">{format(day, "EEE", { locale: ptBR })}</span>
                  <br />
                  <span className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                    {format(day, "dd")}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Hour rows */}
          <div className="divide-y divide-border/20">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[48px]">
                <div className="text-xs text-muted-foreground font-medium p-1 text-right border-r border-border/30 flex items-start justify-end pr-2 pt-1">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {weekDays.map((day) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const key = `${dayStr}_${hour}`;
                  const apts = aptsByDayAndHour.get(key) || [];
                  return (
                    <div key={dayStr} className="border-l border-border/20 p-0.5 space-y-0.5">
                      {apts.map((apt) => {
                        const status = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.pending;
                        return (
                          <button
                            key={apt.id}
                            onClick={() => onEdit(apt)}
                            className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${status.class} hover:opacity-80 transition-opacity`}
                          >
                            {apt.time.slice(0, 5)} {apt.pet_name}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCalendarView;
