import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Crown, XCircle, Clock } from "lucide-react";

const TrialBanner = () => {
  const { phase, daysLeft, daysOverdue, loading } = useTrialStatus();
  const navigate = useNavigate();

  if (loading) return null;

  // Day 5-7: warning
  if (phase === "trial_expiring") {
    return (
      <Alert className="border-accent/50 bg-accent/10">
        <AlertTriangle className="h-4 w-4 text-accent" />
        <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium">
            ⏰ Seu período de teste {daysLeft === 0 ? "termina hoje" : `termina em ${daysLeft} dia${daysLeft > 1 ? "s" : ""}`}!
            {" "}Ative seu plano para continuar usando.
          </span>
          <Button size="sm" className="gap-1" onClick={() => navigate("/my-account")}>
            <Crown className="w-4 h-4" />
            Ativar plano
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Day 8-10: grace period - red fixed banner
  if (phase === "grace_period") {
    const graceDaysLeft = 3 - daysOverdue;
    return (
      <Alert className="border-destructive/50 bg-destructive/10">
        <XCircle className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium text-destructive">
            🚫 Seu trial expirou! Envio de mensagens bloqueado. Você tem {graceDaysLeft} dia{graceDaysLeft !== 1 ? "s" : ""} para ativar seu plano antes do bloqueio total.
          </span>
          <Button size="sm" variant="destructive" className="gap-1" onClick={() => navigate("/my-account")}>
            <Crown className="w-4 h-4" />
            Ativar agora
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial active with days info
  if (phase === "trial_active" && daysLeft <= 4) {
    return (
      <Alert className="border-primary/30 bg-primary/5">
        <Clock className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          📅 Seu período de teste termina em <strong>{daysLeft} dia{daysLeft > 1 ? "s" : ""}</strong>.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default TrialBanner;
