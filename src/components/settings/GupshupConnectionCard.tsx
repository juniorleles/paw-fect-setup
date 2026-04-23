import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageCircle, Copy, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GupshupStatus {
  provider: string;
  status: string;
  appId: string | null;
  appName: string | null;
  phoneNumber: string | null;
  connectedAt: string | null;
}

export const GupshupConnectionCard = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<GupshupStatus | null>(null);
  const [appName, setAppName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gupshup-webhook`;

  const loadStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("gupshup-check-status");
      if (error) throw error;
      setStatus(data);
      setAppName(data.appName || "");
      setPhoneNumber(data.phoneNumber || "");
    } catch (err) {
      console.error("Failed to load Gupshup status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSave = async () => {
    if (!appName.trim() || !phoneNumber.trim()) {
      toast.error("Preencha o nome do app e o número");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("pet_shop_configs")
        .update({
          whatsapp_provider: "gupshup",
          gupshup_app_name: appName.trim(),
          gupshup_phone_number: phoneNumber.replace(/\D/g, ""),
          gupshup_status: "connected",
          gupshup_connected_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Conexão Gupshup salva!");
      await loadStatus();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar conexão");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("URL copiada!");
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const isConnected = status?.status === "connected";

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">WhatsApp via Gupshup</h3>
            <p className="text-sm text-muted-foreground">
              Conecte sua conta Gupshup Partner para enviar e receber mensagens
            </p>
          </div>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"}>
          {isConnected ? "Conectado" : "Desconectado"}
        </Badge>
      </div>

      {/* Webhook URL para o usuário configurar no painel Gupshup */}
      <div className="space-y-2 p-4 rounded-lg bg-muted/50 border">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">
          1. Configure este Webhook no Gupshup
        </Label>
        <div className="flex gap-2">
          <Input value={webhookUrl} readOnly className="font-mono text-xs" />
          <Button size="icon" variant="outline" onClick={handleCopyWebhook}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          No painel Gupshup → seu app → Settings → Callback URL, cole esta URL e
          adicione o parâmetro <code className="bg-background px-1 rounded">?secret=SEU_SECRET</code>
        </p>
      </div>

      {/* Form de conexão manual */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">
          2. Dados do App Gupshup
        </Label>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="gupshup-app-name" className="text-sm">App Name</Label>
            <Input
              id="gupshup-app-name"
              placeholder="ex: MagicZapPetShop"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="gupshup-phone" className="text-sm">Número WhatsApp (com DDI)</Label>
            <Input
              id="gupshup-phone"
              placeholder="ex: 5511999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isConnected ? "Atualizar conexão" : "Conectar"}
        </Button>
      </div>

      <a
        href="https://www.gupshup.io/developer/docs/bot-platform/guide/whatsapp-api-documentation"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
      >
        Documentação Gupshup <ExternalLink className="h-3 w-3" />
      </a>
    </Card>
  );
};
