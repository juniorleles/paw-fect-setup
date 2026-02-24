import { useMemo } from "react";
import { CalendarDays, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Appointment } from "@/types/appointment";

interface Props {
  appointments: Appointment[];
}

const AppointmentStatsBar = ({ appointments }: Props) => {
  const now = new Date();

  const stats = useMemo(() => {
    const active = appointments.filter((a) => a.status !== "cancelled");

    let pending = 0;
    let confirmed = 0;
    let overdue = 0;
    let upcomingApt: Appointment | undefined;

    for (const a of active) {
      const pastTime = new Date(`${a.date}T${a.time}`) < now;

      if (a.status === "completed") {
        confirmed++;
      } else if (pastTime) {
        overdue++;
      } else if (a.status === "confirmed") {
        confirmed++;
        if (!upcomingApt || a.time < upcomingApt.time) upcomingApt = a;
      } else {
        pending++;
        if (!upcomingApt || a.time < upcomingApt.time) upcomingApt = a;
      }
    }

    return { total: active.length, pending, confirmed, overdue, upcoming: upcomingApt };
  }, [appointments]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-sm border border-border/50">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-sm border border-border/50">
        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-success" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">{stats.confirmed}</p>
          <p className="text-xs text-muted-foreground">Confirmados</p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-sm border border-border/50">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <Clock className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </div>
      </div>

      {stats.overdue > 0 ? (
        <div className="flex items-center gap-3 bg-destructive/5 rounded-xl p-3 shadow-sm border border-destructive/20">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-destructive leading-none">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground">Atrasados</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-sm border border-border/50">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            {stats.upcoming ? (
              <>
                <p className="text-2xl font-bold text-foreground leading-none">{stats.upcoming.time.slice(0, 5)}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[100px]">Próximo</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground">Sem próximos</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentStatsBar;
