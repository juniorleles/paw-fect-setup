import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarCheck, MessageSquare, TrendingUp, Sparkles, Check, Crown } from "lucide-react";
import { STRIPE_PLANS } from "@/config/stripe";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentsUsed: number;
  appointmentsLimit: number;
  messagesUsed: number;
  messagesLimit: number;
  estimatedValue: number;
  onSelectPlan: (plan: "starter" | "professional") => void;
  checkoutLoading: string | null;
}

const UpgradeModal = ({
  open,
  onOpenChange,
  appointmentsUsed,
  appointmentsLimit,
  messagesUsed,
  messagesLimit,
  estimatedValue,
  onSelectPlan,
  checkoutLoading,
}: UpgradeModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Sua IA está gerando resultados
          </DialogTitle>
          <DialogDescription>
            Desbloqueie atendimentos ilimitados e continue crescendo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Results summary */}
          <div className="rounded-lg bg-muted/40 p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Resultados do seu trial</p>
            <div className="flex items-center gap-3 text-sm">
              <CalendarCheck className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                <strong>{appointmentsUsed}</strong> clientes agendados pela IA
                <span className="text-muted-foreground"> (de {appointmentsLimit})</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                <strong>{messagesUsed}</strong> mensagens atendidas pela IA
                <span className="text-muted-foreground"> (de {messagesLimit})</span>
              </span>
            </div>
            {estimatedValue > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <TrendingUp className="w-4 h-4 text-success flex-shrink-0" />
                <span>
                  <strong className="text-success">
                    R$ {estimatedValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </strong>{" "}
                  em valor estimado gerado
                </span>
              </div>
            )}
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Ao ativar seu plano, você desbloqueia:</p>
            <ul className="space-y-1.5 text-sm">
              {[
                "Agendamentos ilimitados",
                "Atendimento 24h sem interrupção",
                "Mais mensagens por mês",
                "Suporte prioritário",
              ].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Plan buttons */}
          <div className="space-y-2 pt-2">
            <Button
              className="w-full font-bold"
              onClick={() => onSelectPlan("starter")}
              disabled={checkoutLoading === "starter"}
            >
              <Crown className="w-4 h-4 mr-2" />
              Starter — R$ {STRIPE_PLANS.starter.price}/mês
            </Button>
            <Button
              variant="outline"
              className="w-full border-primary/30"
              onClick={() => onSelectPlan("professional")}
              disabled={checkoutLoading === "professional"}
            >
              Essencial — R$ {STRIPE_PLANS.professional.price}/mês
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
