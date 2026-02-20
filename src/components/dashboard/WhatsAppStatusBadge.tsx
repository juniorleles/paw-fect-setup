import { useWhatsAppStatus, type WhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { Smartphone } from "lucide-react";

const STATUS_CONFIG: Record<WhatsAppStatus, { label: string; dotClass: string; textClass: string }> = {
  connected: {
    label: "WhatsApp conectado",
    dotClass: "bg-success",
    textClass: "text-success",
  },
  pending: {
    label: "Aguardando conexão",
    dotClass: "bg-accent animate-pulse",
    textClass: "text-accent",
  },
  disconnected: {
    label: "WhatsApp desconectado",
    dotClass: "bg-destructive",
    textClass: "text-destructive",
  },
};

const WhatsAppStatusBadge = () => {
  const status = useWhatsAppStatus();
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
      <Smartphone className={`w-4 h-4 ${config.textClass}`} />
      <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
      <span className={`font-medium ${config.textClass}`}>{config.label}</span>
    </div>
  );
};

export default WhatsAppStatusBadge;
