import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, Users, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { InactiveClient } from "@/hooks/useInactiveClients";

interface SendMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: InactiveClient[];
  onSent: (count: number) => void;
}

const DEFAULT_TEMPLATE =
  `Fala {{nome}}! Já faz {{dias_sem_voltar}} dias desde seu último {{ultimo_servico}} 👀\nQuer agendar seu horário essa semana?`;

const SendMessageModal = ({ open, onOpenChange, clients, onSent }: SendMessageModalProps) => {
  const { user } = useAuth();
  const { trialMessagesUsed, trialMessagesLimit } = useSubscription();
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);

  const remainingMessages = Math.max(0, trialMessagesLimit - trialMessagesUsed);
  const canSend = remainingMessages >= clients.length && clients.length > 0;

  // Preview with first client's data
  const preview = useMemo(() => {
    if (clients.length === 0) return messageTemplate;
    const c = clients[0];
    return messageTemplate
      .replace(/\{\{nome\}\}/gi, c.ownerName || "")
      .replace(/\{\{ultimo_servico\}\}/gi, c.mostFrequentService || "")
      .replace(/\{\{dias_sem_voltar\}\}/gi, String(c.daysSinceLastVisit || ""));
  }, [messageTemplate, clients]);

  const handleSend = async () => {
    if (!user || !canSend) return;
    setSending(true);
    try {
      // Get instance name
      const { data: config } = await supabase
        .from("pet_shop_configs")
        .select("evolution_instance_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!config?.evolution_instance_name) {
        toast.error("WhatsApp não configurado. Conecte seu WhatsApp primeiro.");
        return;
      }

      const recipients = clients.map((c) => ({
        phone: c.ownerPhone,
        name: c.ownerName,
        lastService: c.mostFrequentService,
        daysInactive: c.daysSinceLastVisit,
      }));

      const { data, error } = await supabase.functions.invoke("send-reactivation-message", {
        body: {
          recipients,
          messageTemplate,
          instanceName: config.evolution_instance_name,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const sent = data?.sent ?? clients.length;
      const failed = data?.failed ?? 0;

      if (failed > 0) {
        toast.warning(`${sent} mensagens enviadas, ${failed} falharam.`);
      } else {
        toast.success(`${sent} mensagem(ns) enviada(s) com sucesso!`);
      }

      onSent(sent);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar mensagens");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Enviar mensagem de reativação
          </DialogTitle>
          <DialogDescription>
            {clients.length === 1
              ? `Envie uma mensagem para ${clients[0].ownerName}`
              : `Envie uma mensagem para ${clients.length} clientes selecionados`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {clients.length > 1 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Users className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong>{clients.length}</strong> clientes selecionados — a mensagem será personalizada para cada um
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Mensagem (template)
            </label>
            <Textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              rows={5}
              className="font-mono text-sm"
              placeholder="Digite sua mensagem..."
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="outline" className="text-xs font-mono cursor-help" title="Nome do cliente">
                {"{{nome}}"}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono cursor-help" title="Último serviço realizado">
                {"{{ultimo_servico}}"}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono cursor-help" title="Dias desde a última visita">
                {"{{dias_sem_voltar}}"}
              </Badge>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Preview {clients.length > 1 && `(${clients[0]?.ownerName})`}
            </label>
            <div className="p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap border">
              {preview}
            </div>
          </div>

          {!canSend && remainingMessages < clients.length && (
            <p className="text-sm text-destructive font-medium">
              Mensagens insuficientes. Restam {remainingMessages}, necessário {clients.length}.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            {remainingMessages} mensagens restantes neste mês
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !canSend || !messageTemplate.trim()}
            className="gap-2"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {clients.length > 1
              ? `Enviar para ${clients.length} clientes`
              : "Enviar via WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendMessageModal;
