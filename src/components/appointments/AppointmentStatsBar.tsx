import { useMemo } from "react";
import { CalendarDays, Clock, UserX, CheckCircle2 } from "lucide-react";
import type { Appointment } from "@/types/appointment";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  appointments: Appointment[];
}

const AppointmentStatsBar = ({ appointments }: Props) => {
  const now = new Date();

  const stats = useMemo(() => {
    const active = appointments.filter((a) => a.status !== "cancelled");

    let pending = 0;
    let confirmed = 0;
    let noShows = 0;
    let upcomingApt: Appointment | undefined;

    for (const a of active) {
      const pastTime = new Date(`${a.date}T${a.time}`) < now;

      if (a.status === "no_show") {
        noShows++;
      } else if (a.status === "completed" || a.status === "confirmed") {
        confirmed++;
        if (!pastTime && (!upcomingApt || a.time < upcomingApt.time)) upcomingApt = a;
      } else if (pastTime) {
        noShows++; // overdue pending = potential no-show
      } else {
        pending++;
        if (!upcomingApt || a.time < upcomingApt.time) upcomingApt = a;
      }
    }

    return { total: active.length, pending, confirmed, noShows, upcoming: upcomingApt };
  }, [appointments]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-sm border border-border/50 cursor-default">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent><p>Total de agendamentos ativos (exclui cancelados)</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-sm border border-border/50 cursor-default">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">{stats.confirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent><p>Confirmados ou concluídos cujo horário ainda não passou</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-sm border border-border/50 cursor-default">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent><p>Aguardando confirmação e ainda dentro do horário</p></TooltipContent>
        </Tooltip>

        {stats.noShows > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 bg-destructive/5 rounded-xl p-3 shadow-sm border border-destructive/20 cursor-default">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive leading-none">{stats.noShows}</p>
                  <p className="text-xs text-muted-foreground">Faltas</p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent><p>Clientes que faltaram ou estão com horário ultrapassado</p></TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-sm border border-border/50 cursor-default">
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
            </TooltipTrigger>
            <TooltipContent><p>{stats.upcoming ? "Próximo agendamento do período" : "Nenhum agendamento futuro no período"}</p></TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AppointmentStatsBar;
