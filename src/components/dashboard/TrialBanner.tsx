import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Crown, XCircle, MessageSquare, CalendarDays } from "lucide-react";

const TrialBanner = () => {
  const {
    phase, loading,
    appointmentsUsed, appointmentsLimit,
    messagesUsed, messagesLimit,
    appointmentsPercent, messagesPercent,
  } = useTrialStatus();
  const navigate = useNavigate();

  if (loading) return null;

  // Blocked — quota exhausted
  if (phase === "blocked") {
    const aptsExhausted = appointmentsLimit !== -1 && appointmentsUsed >= appointmentsLimit;
    const msgsExhausted = messagesLimit > 0 && messagesUsed >= messagesLimit;
    return (
      <Alert className="border-destructive/50 bg-destructive/10">
        <XCircle className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium text-destructive">
            🚫 Limite atingido!{" "}
            {aptsExhausted && msgsExhausted
              ? "Agendamentos e mensagens esgotados."
              : msgsExhausted
              ? `Limite de ${messagesLimit} mensagens atingido.`
              : `Limite de ${appointmentsLimit} agendamentos atingido.`}
            {" "}Faça upgrade para continuar.
          </span>
          <Button size="sm" variant="destructive" className="gap-1" onClick={() => navigate("/my-account")}>
            <Crown className="w-4 h-4" />
            Ver Plano Pro
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial expiring — 80%+ of any quota
  if (phase === "trial_expiring") {
    const msgsLeft = messagesLimit - messagesUsed;
    const aptsLeft = appointmentsLimit !== -1 ? appointmentsLimit - appointmentsUsed : -1;
    return (
      <Alert className="border-accent/50 bg-accent/10">
        <AlertTriangle className="h-4 w-4 text-accent" />
        <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium">
            ⏰ Seus recursos estão acabando!{" "}
            {appointmentsLimit !== -1 && appointmentsPercent >= 80 && (
              <span className="inline-flex items-center gap-1 mr-2">
                <CalendarDays className="w-3.5 h-3.5" /> {aptsLeft} agendamentos restantes
              </span>
            )}
            {messagesPercent >= 80 && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> {msgsLeft} mensagens restantes
              </span>
            )}
          </span>
          <Button size="sm" className="gap-1" onClick={() => navigate("/my-account")}>
            <Crown className="w-4 h-4" />
            Fazer upgrade
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial active with some usage info
  if (phase === "trial_active" && (
    (appointmentsLimit !== -1 && appointmentsPercent >= 50) || messagesPercent >= 50
  )) {
    return (
      <Alert className="border-primary/30 bg-primary/5">
        <AlertDescription className="text-sm flex items-center gap-3">
          📅 Seus recursos:{" "}
          {appointmentsLimit === -1 ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" /> {appointmentsUsed} agendamentos (ilimitados)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" /> {appointmentsUsed}/{appointmentsLimit} agendamentos
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> {messagesUsed}/{messagesLimit} mensagens
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default TrialBanner;
