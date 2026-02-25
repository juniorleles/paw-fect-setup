import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format, addDays, startOfWeek, addWeeks, subWeeks,
  startOfMonth, endOfMonth, getDay, addMonths, subMonths, isSameMonth,
} from "date-fns";
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
  isPetNiche?: boolean;
  maxConcurrent?: number;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

type CalendarSubView = "month" | "week" | "day";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const AppointmentCalendarView = ({
  appointments,
  onStatusChange,
  onEdit,
  onDelete,
  selectedDate,
  onSelectDate,
  isPetNiche = true,
  maxConcurrent = 1,
}: Props) => {
  const [subView, setSubView] = useState<CalendarSubView>("month");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dayDate, setDayDate] = useState(new Date());
  const [monthDate, setMonthDate] = useState(new Date());

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

  const aptsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((apt) => {
      const list = map.get(apt.date) || [];
      list.push(apt);
      map.set(apt.date, list);
    });
    return map;
  }, [appointments]);

  const todayStr = new Date().toISOString().split("T")[0];

  // Sub-view toggle buttons
  const SubViewToggle = ({ current }: { current: CalendarSubView }) => (
    <div className="flex gap-1 justify-center mt-1">
      {(["month", "week", "day"] as const).map((v) => (
        <Button
          key={v}
          variant={current === v ? "default" : "ghost"}
          size="sm"
          className="h-6 text-xs"
          onClick={() => setSubView(v)}
        >
          {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
        </Button>
      ))}
    </div>
  );

  // ─── MONTH VIEW ───
  if (subView === "month") {
    const mStart = startOfMonth(monthDate);
    const mEnd = endOfMonth(monthDate);
    // getDay returns 0=Sun. Convert to Mon=0
    const startDow = (getDay(mStart) + 6) % 7;
    const totalDays = mEnd.getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(mStart.getFullYear(), mStart.getMonth(), d));
    // fill remaining row
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <Button variant="ghost" size="icon" onClick={() => setMonthDate((m) => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="font-display font-bold text-sm capitalize">
              {format(monthDate, "MMMM yyyy", { locale: ptBR })}
            </p>
            <SubViewToggle current="month" />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMonthDate((m) => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border/50">
          {WEEKDAY_LABELS.map((l) => (
            <div key={l} className="text-center py-2 text-xs font-semibold text-muted-foreground">
              {l}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (!cell) {
              return <div key={`empty-${i}`} className="min-h-[90px] border-t border-r border-border/20 bg-muted/20" />;
            }
            const dayStr = format(cell, "yyyy-MM-dd");
            const isToday = dayStr === todayStr;
            const dayApts = aptsByDay.get(dayStr) || [];
            const activeCount = dayApts.filter((a) => a.status !== "cancelled").length;

            return (
              <button
                key={dayStr}
                onClick={() => {
                  setDayDate(cell);
                  setSubView("day");
                }}
                className={`min-h-[90px] border-t border-r border-border/20 p-1 text-left hover:bg-muted/30 transition-colors relative ${
                  isToday ? "bg-primary/5" : ""
                }`}
              >
                {/* Day number */}
                <span className={`text-xs font-bold inline-block w-6 h-6 rounded-full text-center leading-6 ${
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}>
                  {cell.getDate()}
                </span>

                {/* Appointment count badge */}
                {activeCount > 0 && (
                  <span className="absolute top-1 right-1 text-[9px] font-bold text-muted-foreground">
                    {activeCount}
                  </span>
                )}

                {/* Appointment pills (show max 3) */}
                <div className="mt-0.5 space-y-0.5">
                  {dayApts.slice(0, 3).map((apt) => {
                    const status = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.pending;
                    return (
                      <div
                        key={apt.id}
                        className={`text-[9px] leading-tight font-medium px-1 py-0.5 rounded truncate ${status.class}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(apt);
                        }}
                      >
                        {apt.time.slice(0, 5)} {isPetNiche && apt.pet_name && apt.pet_name !== "—" ? apt.pet_name : apt.owner_name}
                      </div>
                    );
                  })}
                  {dayApts.length > 3 && (
                    <div className="text-[9px] text-muted-foreground font-medium px-1">
                      +{dayApts.length - 3} mais
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── DAY VIEW ───
  if (subView === "day") {
    const dayStr = format(dayDate, "yyyy-MM-dd");
    return (
      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <Button variant="ghost" size="icon" onClick={() => setDayDate((d) => addDays(d, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="font-display font-bold capitalize">
              {format(dayDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            <SubViewToggle current="day" />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setDayDate((d) => addDays(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="divide-y divide-border/30">
          {HOURS.map((hour) => {
            const key = `${dayStr}_${hour}`;
            const apts = aptsByDayAndHour.get(key) || [];
            const activeCount = apts.filter((a) => a.status !== "cancelled").length;
            const isFull = activeCount >= maxConcurrent;
            return (
              <div key={hour} className="flex min-h-[60px]">
                <div className="w-16 flex-shrink-0 text-xs text-muted-foreground font-medium p-2 text-right border-r border-border/30">
                  {String(hour).padStart(2, "0")}:00
                </div>
                <div className={`flex-1 p-1 space-y-1 relative ${isFull ? "bg-destructive/5" : ""}`}>
                  {activeCount > 0 && (
                    <span className={`absolute top-1 right-2 text-[10px] font-bold ${isFull ? "text-destructive" : "text-muted-foreground"}`}>
                      {activeCount}/{maxConcurrent}
                    </span>
                  )}
                  {apts.map((apt) => {
                    const status = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.pending;
                    return (
                      <button
                        key={apt.id}
                        onClick={() => onEdit(apt)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium truncate ${status.class} hover:opacity-80 transition-opacity`}
                      >
                        <span className="font-bold">{apt.time.slice(0, 5)}</span> {apt.owner_name} · {isPetNiche && apt.pet_name && apt.pet_name !== "—" ? `${apt.pet_name} · ` : ""}{apt.service}
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

  // ─── WEEK VIEW ───
  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <p className="font-display font-bold text-sm">
            {format(weekStart, "dd MMM", { locale: ptBR })} – {format(addDays(weekStart, 6), "dd MMM yyyy", { locale: ptBR })}
          </p>
          <SubViewToggle current="week" />
        </div>
        <Button variant="ghost" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50">
            <div />
            {weekDays.map((day) => {
              const isToday = format(day, "yyyy-MM-dd") === todayStr;
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => { setDayDate(day); setSubView("day"); }}
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
                  const activeCount = apts.filter((a) => a.status !== "cancelled").length;
                  const isFull = activeCount >= maxConcurrent;
                  return (
                    <div key={dayStr} className={`border-l border-border/20 p-0.5 space-y-0.5 relative ${isFull ? "bg-destructive/5" : ""}`}>
                      {activeCount > 0 && (
                        <span className={`absolute top-0.5 right-1 text-[9px] font-bold leading-none ${isFull ? "text-destructive" : "text-muted-foreground"}`}>
                          {activeCount}/{maxConcurrent}
                        </span>
                      )}
                      {apts.map((apt) => {
                        const status = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.pending;
                        return (
                          <button
                            key={apt.id}
                            onClick={() => onEdit(apt)}
                            className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${status.class} hover:opacity-80 transition-opacity`}
                          >
                            {apt.time.slice(0, 5)} {isPetNiche && apt.pet_name && apt.pet_name !== "—" ? apt.pet_name : apt.owner_name}
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
