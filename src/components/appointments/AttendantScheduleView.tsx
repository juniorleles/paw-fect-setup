import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Appointment } from "@/types/appointment";
import { STATUS_CONFIG } from "./AppointmentCard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  appointments: Appointment[];
  attendants: string[];
  onEdit: (apt: Appointment) => void;
  isPetNiche?: boolean;
  businessHours?: any[];
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

const DAY_MAP: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

const AttendantScheduleView = ({
  appointments,
  attendants,
  onEdit,
  isPetNiche = true,
  businessHours = [],
}: Props) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = format(currentDate, "yyyy-MM-dd");
  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = dateStr === todayStr;

  const filledAttendants = useMemo(
    () => attendants.filter((n) => n.trim()),
    [attendants]
  );

  // Get today's schedule to determine working hours
  const daySchedule = useMemo(() => {
    const dayName = DAY_MAP[currentDate.getDay()];
    return businessHours.find((d: any) => d.day === dayName);
  }, [currentDate, businessHours]);

  const visibleHours = useMemo(() => {
    if (!daySchedule || !daySchedule.isOpen) return HOURS;
    const openHour = parseInt(daySchedule.openTime?.split(":")[0] || "7");
    const closeHour = Math.min(
      parseInt(daySchedule.closeTime?.split(":")[0] || "20") + 1,
      21
    );
    return Array.from(
      { length: closeHour - openHour },
      (_, i) => i + openHour
    );
  }, [daySchedule]);

  // Map: attendant → hour → appointments
  const scheduleMap = useMemo(() => {
    const map = new Map<string, Map<number, Appointment[]>>();
    filledAttendants.forEach((att) => map.set(att, new Map()));

    // Also track unassigned
    map.set("__unassigned__", new Map());

    const dayApts = appointments.filter(
      (a) => a.date === dateStr && a.status !== "cancelled"
    );

    dayApts.forEach((apt) => {
      const hour = parseInt(apt.time.slice(0, 2));
      const attName = apt.professional_name || "__unassigned__";
      const attMap = map.get(attName) || map.get("__unassigned__")!;
      const list = attMap.get(hour) || [];
      list.push(apt);
      attMap.set(hour, list);
    });

    return map;
  }, [appointments, dateStr, filledAttendants]);

  // Stats per attendant
  const stats = useMemo(() => {
    const result = new Map<string, { total: number; completed: number }>();
    const dayApts = appointments.filter(
      (a) => a.date === dateStr && a.status !== "cancelled"
    );

    filledAttendants.forEach((att) => {
      const attApts = dayApts.filter((a) => a.professional_name === att);
      result.set(att, {
        total: attApts.length,
        completed: attApts.filter((a) => a.status === "completed").length,
      });
    });

    const unassigned = dayApts.filter(
      (a) => !a.professional_name || !filledAttendants.includes(a.professional_name)
    );
    if (unassigned.length > 0) {
      result.set("__unassigned__", {
        total: unassigned.length,
        completed: unassigned.filter((a) => a.status === "completed").length,
      });
    }

    return result;
  }, [appointments, dateStr, filledAttendants]);

  const hasUnassigned = (stats.get("__unassigned__")?.total || 0) > 0;
  const displayAttendants = [
    ...filledAttendants,
    ...(hasUnassigned ? ["__unassigned__"] : []),
  ];

  if (filledAttendants.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <User className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Nenhum atendente cadastrado. Adicione atendentes nas configurações
            para visualizar a agenda por profissional.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isClosed = daySchedule && !daySchedule.isOpen;

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border/50 shadow-sm p-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentDate((d) => addDays(d, -1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <p className="font-display font-bold capitalize">
            {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          {isToday && (
            <span className="text-xs text-primary font-semibold">Hoje</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentDate((d) => addDays(d, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isClosed ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              Fechado neste dia
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Attendant stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {displayAttendants.map((att) => {
              const s = stats.get(att);
              const isUnassigned = att === "__unassigned__";
              const label = isUnassigned ? "Sem atendente" : att;
              return (
                <Card key={att} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          isUnassigned
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {isUnassigned ? "?" : label.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold truncate">{label}</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold">
                        {s?.total || 0}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        agendamento{(s?.total || 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {(s?.completed || 0) > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {s!.completed} concluído{s!.completed !== 1 ? "s" : ""}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Timeline grid */}
          <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div
                style={{
                  minWidth: `${80 + displayAttendants.length * 160}px`,
                }}
              >
                {/* Header row */}
                <div
                  className="grid border-b border-border/50"
                  style={{
                    gridTemplateColumns: `60px repeat(${displayAttendants.length}, 1fr)`,
                  }}
                >
                  <div className="p-2 text-xs font-medium text-muted-foreground text-center">
                    Hora
                  </div>
                  {displayAttendants.map((att) => {
                    const isUnassigned = att === "__unassigned__";
                    return (
                      <div
                        key={att}
                        className="p-2 text-center border-l border-border/30"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isUnassigned
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {isUnassigned
                              ? "?"
                              : att.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold truncate max-w-[100px]">
                            {isUnassigned ? "Sem atendente" : att}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time rows */}
                <div className="divide-y divide-border/20">
                  {visibleHours.map((hour) => {
                    const nowHour = new Date().getHours();
                    const isCurrentHour = isToday && hour === nowHour;

                    return (
                      <div
                        key={hour}
                        className={`grid min-h-[52px] ${
                          isCurrentHour ? "bg-primary/5" : ""
                        }`}
                        style={{
                          gridTemplateColumns: `60px repeat(${displayAttendants.length}, 1fr)`,
                        }}
                      >
                        <div className="text-xs text-muted-foreground font-medium p-2 text-right border-r border-border/30 flex items-start justify-end pr-2 pt-2">
                          <span
                            className={
                              isCurrentHour
                                ? "text-primary font-bold"
                                : ""
                            }
                          >
                            {String(hour).padStart(2, "0")}:00
                          </span>
                        </div>
                        {displayAttendants.map((att) => {
                          const attMap = scheduleMap.get(att);
                          const apts = attMap?.get(hour) || [];

                          return (
                            <div
                              key={att}
                              className={`border-l border-border/20 p-1 space-y-1 ${
                                apts.length > 0 ? "" : ""
                              }`}
                            >
                              {apts.map((apt) => {
                                const status =
                                  STATUS_CONFIG[apt.status] ??
                                  STATUS_CONFIG.pending;
                                return (
                                  <TooltipProvider key={apt.id}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => onEdit(apt)}
                                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium truncate ${status.class} hover:opacity-80 transition-opacity`}
                                        >
                                          <span className="font-bold">
                                            {apt.time.slice(0, 5)}
                                          </span>{" "}
                                          {isPetNiche &&
                                          apt.pet_name &&
                                          apt.pet_name !== "—"
                                            ? apt.pet_name
                                            : apt.owner_name}{" "}
                                          · {apt.service}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="space-y-0.5 text-xs">
                                          <p className="font-semibold">
                                            {apt.owner_name}
                                          </p>
                                          {isPetNiche &&
                                            apt.pet_name &&
                                            apt.pet_name !== "—" && (
                                              <p>Pet: {apt.pet_name}</p>
                                            )}
                                          <p>
                                            {apt.service} · {apt.time.slice(0, 5)}
                                          </p>
                                          <p className="capitalize">
                                            {status.label}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendantScheduleView;
