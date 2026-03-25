import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UserRoundCog, X } from "lucide-react";

export interface HumanHandoffTriggers {
  tags: string[];
  custom_rules: string;
}

const PREDEFINED_TAGS = [
  { id: "reclamacao", label: "Reclamações", description: "Cliente insatisfeito ou reclamando" },
  { id: "negociacao", label: "Negociação de preço", description: "Pedido de desconto ou negociação" },
  { id: "duvida_complexa", label: "Dúvida complexa", description: "IA não sabe responder" },
  { id: "emergencia", label: "Urgência / Emergência", description: "Situação urgente do cliente" },
  { id: "reembolso", label: "Reembolso / Estorno", description: "Solicitação de devolução" },
  { id: "elogio", label: "Elogios / Feedback", description: "Cliente quer falar com o dono" },
  { id: "outro_assunto", label: "Assunto fora do escopo", description: "Tema que a IA não cobre" },
];

interface Props {
  triggers: HumanHandoffTriggers;
  onChange: (triggers: HumanHandoffTriggers) => void;
}

const HumanHandoffConfig = ({ triggers, onChange }: Props) => {
  const toggleTag = (tagId: string) => {
    const current = triggers.tags || [];
    const updated = current.includes(tagId)
      ? current.filter((t) => t !== tagId)
      : [...current, tagId];
    onChange({ ...triggers, tags: updated });
  };

  return (
    <Card className="border-none shadow-lg bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <UserRoundCog className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-lg font-display">Transferência para Atendente Humano</CardTitle>
            <CardDescription className="text-sm">
              Defina quando a IA deve transferir a conversa para você
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-2">
        {/* Predefined tags */}
        <div className="space-y-2">
          <Label className="font-semibold text-sm">Cenários de transferência</Label>
          <p className="text-xs text-muted-foreground">
            Selecione os cenários em que a IA deve parar e transferir para você
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {PREDEFINED_TAGS.map((tag) => {
              const isActive = (triggers.tags || []).includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className="group"
                  title={tag.description}
                >
                  <Badge
                    variant={isActive ? "default" : "outline"}
                    className={`cursor-pointer transition-all text-xs px-3 py-1.5 ${
                      isActive
                        ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                        : "hover:border-orange-300 hover:text-orange-600"
                    }`}
                  >
                    {tag.label}
                    {isActive && <X className="w-3 h-3 ml-1.5" />}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom rules */}
        <div className="space-y-2">
          <Label className="font-semibold text-sm">Regras personalizadas (opcional)</Label>
          <p className="text-xs text-muted-foreground">
            Escreva em linguagem natural quando mais a IA deve transferir. Ex: "Quando o cliente pedir para falar com o dono" ou "Quando mencionar problema de saúde do pet"
          </p>
          <Textarea
            placeholder="Ex: Quando o cliente insistir mais de 2 vezes na mesma pergunta..."
            value={triggers.custom_rules || ""}
            onChange={(e) => onChange({ ...triggers, custom_rules: e.target.value })}
            className="min-h-[80px] resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {(triggers.custom_rules || "").length}/500
          </p>
        </div>

        {/* Info */}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">💡 Como funciona?</p>
          <p>Quando a IA detectar um desses cenários, ela envia uma mensagem ao cliente dizendo que vai transferir para um atendente e notifica você por WhatsApp.</p>
          <p>A IA pausa automaticamente e volta ao normal após 2 horas sem interação.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HumanHandoffConfig;
