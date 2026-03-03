import { useState } from "react";
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
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface SendMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientPhone: string;
  onSent: () => void;
}

const DEFAULT_MESSAGE = (name: string) =>
  `Fala ${name}! Já faz um tempinho desde seu último corte 👀\nQuer agendar seu horário essa semana?`;

const SendMessageModal = ({ open, onOpenChange, clientName, clientPhone, onSent }: SendMessageModalProps) => {
  const { user } = useAuth();
  const { trialMessagesUsed, trialMessagesLimit } = useSubscription();
  const [message, setMessage] = useState(DEFAULT_MESSAGE(clientName));
  const [sending, setSending] = useState(false);

  const remainingMessages = Math.max(0, trialMessagesLimit - trialMessagesUsed);
  const canSend = remainingMessages > 0;

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

      // Send message via Evolution API through edge function
      const { error } = await supabase.functions.invoke("send-reactivation-message", {
        body: {
          phone: clientPhone,
          message,
          instanceName: config.evolution_instance_name,
        },
      });

      if (error) throw error;

      // Record the contact
      const campaignMonth = new Date().toISOString().slice(0, 7);
      await supabase.from("customer_contacts").insert({
        user_id: user.id,
        customer_phone: clientPhone,
        customer_name: clientName,
        message,
        campaign_month: campaignMonth,
      });

      toast.success("Mensagem enviada com sucesso!");
      onSent();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Enviar mensagem para {clientName}
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem de reativação via WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Telefone</label>
            <p className="text-sm font-mono">{clientPhone}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Mensagem</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="mt-1"
              placeholder="Digite sua mensagem..."
            />
          </div>

          {!canSend && (
            <p className="text-sm text-destructive font-medium">
              Limite de mensagens atingido ({trialMessagesLimit}/{trialMessagesLimit}).
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
          <Button onClick={handleSend} disabled={sending || !canSend || !message.trim()} className="gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendMessageModal;
