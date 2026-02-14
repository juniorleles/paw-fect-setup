import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingData } from "@/types/onboarding";
import { CheckCircle2, MessageCircle, Clock, Scissors, Bot } from "lucide-react";

interface Props {
  data: OnboardingData;
}

const CONFETTI_COLORS = [
  "hsl(270 60% 55%)",
  "hsl(25 95% 55%)",
  "hsl(145 60% 45%)",
  "hsl(340 80% 60%)",
  "hsl(45 95% 55%)",
];

const SuccessScreen = ({ data }: Props) => {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; color: string; delay: number; size: number }>>([]);

  useEffect(() => {
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 2,
      size: Math.random() * 8 + 4,
    }));
    setConfetti(pieces);
  }, []);

  const openDays = data.businessHours.filter((d) => d.isOpen).length;

  return (
    <div className="relative overflow-hidden">
      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="fixed pointer-events-none animate-confetti-fall"
          style={{
            left: `${c.left}%`,
            top: -20,
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            borderRadius: c.size > 8 ? "50%" : "2px",
            animationDelay: `${c.delay}s`,
            zIndex: 50,
          }}
        />
      ))}

      <Card className="border-none shadow-xl bg-card animate-bounce-in">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-success" />
          </div>

          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">
              Secretária Ativada! 🎉
            </h2>
            <p className="text-muted-foreground mt-2 text-lg">
              <span className="font-bold text-primary">{data.assistantName}</span> está pronta para atender seus clientes
            </p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
            <div className="p-3 rounded-xl bg-secondary flex items-start gap-2">
              <MessageCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="text-sm font-semibold">{data.phone}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-secondary flex items-start gap-2">
              <Clock className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Funcionamento</p>
                <p className="text-sm font-semibold">{openDays} dias/semana</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-secondary flex items-start gap-2">
              <Scissors className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Serviços</p>
                <p className="text-sm font-semibold">{data.services.length} cadastrados</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-secondary flex items-start gap-2">
              <Bot className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Tom de voz</p>
                <p className="text-sm font-semibold capitalize">
                  {data.voiceTone === "friendly" ? "Amigável" : data.voiceTone === "fun" ? "Divertido" : "Formal"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 max-w-sm mx-auto">
            <p className="text-sm italic text-foreground">
              "Olá! Eu sou a <strong>{data.assistantName}</strong>, secretária digital do{" "}
              <strong>{data.shopName}</strong>. Estou aqui pra te ajudar a agendar os melhores serviços pro seu pet! 🐾"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuccessScreen;
