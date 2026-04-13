import { useState, useEffect, useCallback, useRef } from "react";
import { useWhatsAppStatus, type WhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { Button } from "@/components/ui/button";
import { Smartphone, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const META_APP_ID = "910231245041925";
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID || "1971865603763858";

const STATUS_CONFIG: Record<WhatsAppStatus, { label: string; dotClass: string; textClass: string }> = {
  connected: {
    label: "WhatsApp conectado (Meta)",
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
  const { status } = useWhatsAppStatus();
  const config = STATUS_CONFIG[status];
  const { toast } = useToast();
  const { user } = useAuth();

  const [metaConnecting, setMetaConnecting] = useState(false);

  // --- Meta Embedded Signup ---
  const handleMetaConnect = useCallback(() => {
    if (!user?.id) return;
    setMetaConnecting(true);

    const launchLogin = () => {
      (window as any).FB.login(
        (response: any) => {
          if (response.authResponse?.accessToken) {
            supabase.functions
              .invoke("whatsapp-embedded-signup", {
                method: "POST",
                body: { accessToken: response.authResponse.accessToken, userId: user.id },
              })
              .then(({ data, error }) => {
                if (error || data?.error) {
                  toast({
                    title: "Erro ao conectar",
                    description: data?.error || error?.message,
                    variant: "destructive",
                  });
                } else {
                  toast({
                    title: "WhatsApp conectado!",
                    description: "Conexão oficial da Meta configurada com sucesso.",
                  });
                }
              })
              .finally(() => setMetaConnecting(false));
          } else {
            setMetaConnecting(false);
          }
        },
        {
          config_id: META_CONFIG_ID,
          response_type: "token",
          override_default_response_type: true,
          extras: {
            setup: {},
            featureType: "",
            sessionInfoVersion: "3",
          },
        }
      );
    };

    if ((window as any).FB) {
      launchLogin();
    } else {
      (window as any).fbAsyncInit = () => {
        (window as any).FB.init({
          appId: META_APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: "v21.0",
        });
        launchLogin();
      };
      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [user, toast]);

  const handleDisconnect = useCallback(async () => {
    try {
      const { error } = await supabase.functions.invoke("reconnect-whatsapp", {
        method: "POST",
        body: { disconnect: true },
      });
      if (!error) {
        toast({ title: "WhatsApp desconectado", description: "Você pode reconectar a qualquer momento." });
      }
    } catch {
      toast({ title: "Erro ao desconectar", variant: "destructive" });
    }
  }, [toast]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
        <Smartphone className={`w-4 h-4 ${config.textClass}`} />
        <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
        <span className={`font-medium ${config.textClass}`}>{config.label}</span>
      </div>
      {(status === "disconnected" || status === "pending") && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMetaConnect}
          disabled={metaConnecting}
          className="gap-1.5 text-xs"
        >
          {metaConnecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Shield className="w-3.5 h-3.5" />
          )}
          Conectar com Meta
        </Button>
      )}
    </div>
  );
};

export default WhatsAppStatusBadge;
