import { useState, useEffect, useCallback, useRef } from "react";
import { useWhatsAppStatus, type WhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { Button } from "@/components/ui/button";
import { Smartphone, Loader2, Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const META_APP_ID = "1335266151850577";
// MagicZap WhatsApp Embed v3 — variação "Cadastro incorporado do WhatsApp" (criada 2026-04-24)
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID || "26825466373816190";

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
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);

  // Check if phone is verified before allowing Meta connect
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("pet_shop_configs")
      .select("phone_verified, phone")
      .eq("user_id", user.id)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          const digits = (data.phone || "").replace(/\D/g, "");
          setPhoneVerified(data.phone_verified && digits.length === 11);
        }
      });
  }, [user?.id]);
  // --- Meta Embedded Signup ---
  const handleMetaConnect = useCallback(() => {
    if (!user?.id) return;
    setMetaConnecting(true);

    const launchLogin = () => {
      try {
        (window as any).FB.login(
          (response: any) => {
            console.log("[META-CONNECT] FB.login response:", JSON.stringify(response));
            if (response.authResponse?.accessToken) {
              toast({
                title: "Processando conexão...",
                description: "Configurando sua conta WhatsApp Business.",
              });
              supabase.functions
                .invoke("whatsapp-embedded-signup", {
                  method: "POST",
                  body: { accessToken: response.authResponse.accessToken, userId: user.id },
                })
                .then(({ data, error }) => {
                  console.log("[META-CONNECT] Embedded signup result:", { data, error });
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
              console.warn("[META-CONNECT] Login cancelled or failed:", response);
              toast({
                title: "Conexão cancelada",
                description: "O processo de login com o Facebook foi cancelado. Tente novamente.",
                variant: "destructive",
              });
              setMetaConnecting(false);
            }
          },
          {
            config_id: META_CONFIG_ID,
            response_type: "code",
            override_default_response_type: true,
            extras: {
              setup: {},
              featureType: "",
              sessionInfoVersion: "3",
            },
          }
        );
      } catch (err) {
        console.error("[META-CONNECT] FB.login error:", err);
        toast({
          title: "Erro ao abrir login",
          description: "Não foi possível abrir o popup do Facebook. Verifique se popups estão habilitados no seu navegador.",
          variant: "destructive",
        });
        setMetaConnecting(false);
      }
    };

    if ((window as any).FB) {
      launchLogin();
    } else {
      console.warn("[META-CONNECT] FB SDK not loaded, loading dynamically...");
      const existingScript = document.querySelector('script[src*="connect.facebook.net"]');
      if (existingScript) {
        // SDK script exists but not initialized yet - wait a bit
        const waitForFB = setInterval(() => {
          if ((window as any).FB) {
            clearInterval(waitForFB);
            launchLogin();
          }
        }, 200);
        setTimeout(() => {
          clearInterval(waitForFB);
          if (!(window as any).FB) {
            toast({
              title: "Facebook SDK não carregou",
              description: "Recarregue a página e tente novamente. Se o problema persistir, desative bloqueadores de anúncios.",
              variant: "destructive",
            });
            setMetaConnecting(false);
          }
        }, 5000);
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
        script.onerror = () => {
          toast({
            title: "Erro ao carregar Facebook",
            description: "Não foi possível carregar o SDK do Facebook. Desative bloqueadores de anúncios e tente novamente.",
            variant: "destructive",
          });
          setMetaConnecting(false);
        };
        document.body.appendChild(script);
      }
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
        phoneVerified === false ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Verifique seu telefone nas configurações antes de conectar</span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMetaConnect}
            disabled={metaConnecting || phoneVerified === null}
            className="gap-1.5 text-xs"
          >
            {metaConnecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Shield className="w-3.5 h-3.5" />
            )}
            Conectar com Meta
          </Button>
        )
      )}
    </div>
  );
};

export default WhatsAppStatusBadge;
