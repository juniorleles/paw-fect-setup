import { useMemo } from "react";
import { CalendarDays, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Appointment } from "@/types/appointment";

interface Props {
  appointments: Appointment[];
}

const AppointmentStatsBar = ({ appointments }: Props) => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const stats = useMemo(() => {
    const todayApts = appointments.filter((a) => a.date === todayStr && a.status !== "cancelled");
    const pending = todayApts.filter((a) => a.status === "pending").length;
    const confirmed = todayApts.filter((a) => a.status === "confirmed" || a.status === "completed").length;

    const overdue = appointments.filter((a) => {
      if (a.status === "cancelled" || a.status === "completed") return false;
      const aptDateTime = new Date(`${a.date}T${a.time}`);
      return aptDateTime < now;
    }).length;

    const upcoming = todayApts
      .filter((a) => {
        const aptDateTime = new Date(`${a.date}T${a.time}`);
        return aptDateTime > now;
      })
      .sort((a, b) => a.time.localeCompare(b.time))[0];

    return { todayTotal: todayApts.length, pending, confirmed, overdue, upcoming };
  }, [appointments, todayStr]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-sm border border-border/50">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">{stats.todayTotal}</p>
          <p className="text-xs text-muted-foreground">Hoje</p>
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
