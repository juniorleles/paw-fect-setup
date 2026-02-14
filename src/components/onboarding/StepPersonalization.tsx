import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "@/types/onboarding";
import { Bot, Briefcase, Heart, PartyPopper } from "lucide-react";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
  errors: Record<string, string>;
}

const tones = [
  {
    key: "formal" as const,
    label: "Formal",
    icon: Briefcase,
    example: "Bom dia! Seja bem-vindo(a) ao nosso pet shop. Como posso ajudá-lo(a) hoje?",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    activeColor: "bg-blue-100 border-blue-400 ring-2 ring-blue-300",
  },
  {
    key: "friendly" as const,
    label: "Amigável",
    icon: Heart,
    example: "Oi! 😊 Que bom ter você aqui! Como posso te ajudar com seu pet?",
    color: "bg-pink-50 border-pink-200 text-pink-800",
    activeColor: "bg-pink-100 border-pink-400 ring-2 ring-pink-300",
  },
  {
    key: "fun" as const,
    label: "Divertido",
    icon: PartyPopper,
    example: "E aí, humano! 🐾 Seu pet mandou avisar que tá precisando de um banho! Bora agendar?",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    activeColor: "bg-amber-100 border-amber-400 ring-2 ring-amber-300",
  },
];

const StepPersonalization = ({ data, onChange, errors }: Props) => {
  const activeTone = tones.find((t) => t.key === data.voiceTone);

  return (
    <Card className="border-none shadow-xl bg-card">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-3">
          <Bot className="w-8 h-8 text-accent" />
        </div>
        <CardTitle className="text-2xl font-display">Personalizar IA</CardTitle>
        <CardDescription className="text-base">
          Defina a personalidade da sua secretária digital
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {/* Voice tone */}
        <div className="space-y-3">
          <Label className="font-semibold">Tom de voz</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tones.map((tone) => {
              const Icon = tone.icon;
              const isActive = data.voiceTone === tone.key;
              return (
                <button
                  key={tone.key}
                  onClick={() => onChange({ voiceTone: tone.key })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isActive ? tone.activeColor : tone.color
                  } hover:scale-[1.02]`}
                >
                  <Icon className="w-6 h-6 mb-2" />
                  <p className="font-bold text-sm">{tone.label}</p>
                  <p className="text-xs mt-1 opacity-80 leading-relaxed">"{tone.example}"</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Assistant name */}
        <div className="space-y-2">
          <Label htmlFor="assistantName" className="font-semibold">Nome da secretária *</Label>
          <Input
            id="assistantName"
            placeholder="Ex: Luna, Mel, Flora..."
            value={data.assistantName}
            onChange={(e) => onChange({ assistantName: e.target.value })}
            className="h-11"
          />
          {errors.assistantName && <p className="text-sm text-destructive">{errors.assistantName}</p>}
        </div>

        {/* Preview */}
        {data.assistantName && activeTone && (
          <div className="p-4 rounded-2xl bg-secondary space-y-2">
            <Label className="font-semibold text-xs text-muted-foreground">PREVIEW NO WHATSAPP</Label>
            <div className="bg-card rounded-xl p-3 shadow-sm">
              <p className="text-sm font-bold text-primary">{data.assistantName}</p>
              <p className="text-sm mt-1">{activeTone.example.replace("nosso pet shop", data.shopName || "nosso pet shop")}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StepPersonalization;
