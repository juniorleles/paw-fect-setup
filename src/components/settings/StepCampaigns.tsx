import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, RotateCcw, Info, MessageSquare, Gift } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface CampaignMessages {
  winback_15?: string;
  winback_30?: string;
  winback_60?: string;
  upsell?: string;
}

interface StepCampaignsProps {
  messages: CampaignMessages;
  onChange: (messages: CampaignMessages) => void;
  isPro: boolean;
}

const VARIABLES_HELP = [
  { var: "{nome}", desc: "Primeiro nome do cliente" },
  { var: "{servico}", desc: "Último serviço realizado" },
  { var: "{dias}", desc: "Dias de inatividade (win-back)" },
  { var: "{loja}", desc: "Nome do estabelecimento" },
  { var: "{sugestoes}", desc: "Lista de serviços sugeridos (upsell)" },
];

const DEFAULT_MESSAGES: Record<string, string> = {
  winback_15: `E aí, {nome}! 💈\n\nFaz {dias} dias desde o último *{servico}* aqui na *{loja}*. Tá na hora de dar aquele tapa no visual, né? 😎\n\nQuer agendar? É só me dizer o melhor dia e horário! 💈`,
  winback_30: `Fala, {nome}! 💈\n\nSumiu, hein! Já faz {dias} dias que você não aparece aqui na *{loja}*.\n\nReservei um horário especial pra você voltar e ficar na régua. Quer marcar? Me manda o dia que fica melhor! 🔥`,
  winback_60: `{nome}, saudade de você por aqui! 💈\n\nJá faz mais de {dias} dias desde seu último *{servico}* na *{loja}*.\n\nQue tal voltar com um combo especial? Corte + barba com aquele precinho de cliente VIP! 💪\n\nMe chama pra agendar! 💈`,
  upsell: `E aí, {nome}! 💈\n\nCurtiu o *{servico}* de ontem aqui na *{loja}*? Ficou show! 🔥\n\nNa próxima, que tal completar o visual com:\n{sugestoes}\n\nQuer agendar? Me manda o dia e horário que fica melhor! 😎`,
};

const StepCampaigns = ({ messages, onChange, isPro }: StepCampaignsProps) => {
  const defaults = getDefaults(niche);

  const getValue = (key: keyof CampaignMessages) => {
    return messages[key] || "";
  };

  const getPlaceholder = (key: string) => {
    return defaults[key] || "";
  };

  const handleChange = (key: keyof CampaignMessages, value: string) => {
    onChange({ ...messages, [key]: value });
  };

  const handleReset = (key: keyof CampaignMessages) => {
    const newMessages = { ...messages };
    delete newMessages[key];
    onChange(newMessages);
  };

  if (!isPro) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="pt-6 text-center space-y-3">
          <Crown className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Personalização de mensagens de campanha disponível no <Badge variant="secondary" className="text-[10px] font-bold uppercase">Plano Pro</Badge>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Variáveis disponíveis
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-72 p-3">
            <p className="text-xs font-semibold mb-2">Use estas variáveis nos templates:</p>
            <div className="space-y-1.5">
              {VARIABLES_HELP.map((v) => (
                <div key={v.var} className="flex items-start gap-2 text-xs">
                  <code className="bg-muted px-1 py-0.5 rounded font-mono text-[11px] shrink-0">{v.var}</code>
                  <span className="text-muted-foreground">{v.desc}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <span className="text-xs">Deixe vazio para usar a mensagem padrão.</span>
      </div>

      <Tabs defaultValue="winback" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="winback" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Win-back
          </TabsTrigger>
          <TabsTrigger value="upsell" className="gap-1.5">
            <Gift className="w-3.5 h-3.5" />
            Pós-atendimento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="winback" className="mt-4 space-y-4">
          {(["winback_15", "winback_30", "winback_60"] as const).map((key) => {
            const labels: Record<string, { title: string; desc: string }> = {
              winback_15: { title: "15 dias inativo 💬", desc: "Primeiro contato com tom leve e convidativo" },
              winback_30: { title: "30 dias inativo 🔥", desc: "Mensagem mais urgente com oferta de horário especial" },
              winback_60: { title: "60 dias inativo 💎", desc: "Abordagem VIP com oferta exclusiva" },
            };
            const info = labels[key];

            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">{info.title}</CardTitle>
                      <CardDescription className="text-xs">{info.desc}</CardDescription>
                    </div>
                    {getValue(key) && (
                      <Button variant="ghost" size="sm" onClick={() => handleReset(key)} className="text-xs gap-1 h-7">
                        <RotateCcw className="w-3 h-3" />
                        Restaurar padrão
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={getValue(key)}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={getPlaceholder(key)}
                    rows={6}
                    className="font-mono text-xs resize-y"
                  />
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="upsell" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Mensagem de Upsell 🎁</CardTitle>
                  <CardDescription className="text-xs">
                    Enviada 24h após atendimento concluído sugerindo serviços complementares
                  </CardDescription>
                </div>
                {getValue("upsell") && (
                  <Button variant="ghost" size="sm" onClick={() => handleReset("upsell")} className="text-xs gap-1 h-7">
                    <RotateCcw className="w-3 h-3" />
                    Restaurar padrão
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={getValue("upsell")}
                onChange={(e) => handleChange("upsell", e.target.value)}
                placeholder={getPlaceholder("upsell")}
                rows={8}
                className="font-mono text-xs resize-y"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StepCampaigns;
