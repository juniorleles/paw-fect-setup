import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingData, INITIAL_DATA } from "@/types/onboarding";
import StepWhatsApp from "@/components/onboarding/StepWhatsApp";
import StepPetShopData from "@/components/onboarding/StepPetShopData";
import StepBusinessHours from "@/components/onboarding/StepBusinessHours";
import StepServices from "@/components/onboarding/StepServices";
import StepPersonalization from "@/components/onboarding/StepPersonalization";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscription } from "@/hooks/useSubscription";
import CancelSubscriptionDialog from "@/components/CancelSubscriptionDialog";
import { Badge } from "@/components/ui/badge";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { status: subStatus, cancel, cancelling } = useSubscription();
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: configs } = await supabase
        .from("pet_shop_configs")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);

      if (configs && configs.length > 0) {
        const c = configs[0];
        setConfigId(c.id);
        setData({
          phone: c.phone,
          phoneVerified: c.phone_verified,
          shopName: c.shop_name,
          address: c.address,
          neighborhood: c.neighborhood,
          city: c.city,
          state: c.state,
          businessHours: c.business_hours as unknown as OnboardingData["businessHours"],
          services: c.services as unknown as OnboardingData["services"],
          voiceTone: c.voice_tone as OnboardingData["voiceTone"],
          assistantName: c.assistant_name,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleSave = async () => {
    if (!user || !configId) return;
    setSaving(true);
    await supabase
      .from("pet_shop_configs")
      .update({
        phone: data.phone,
        phone_verified: data.phoneVerified,
        shop_name: data.shopName,
        address: data.address,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        business_hours: data.businessHours as any,
        services: data.services as any,
        voice_tone: data.voiceTone,
        assistant_name: data.assistantName,
      })
      .eq("id", configId);
    setSaving(false);
    toast({ title: "Configurações salvas!", description: "Todas as alterações foram aplicadas." });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCancelSubscription = async () => {
    const { error } = await cancel();
    if (error) {
      toast({ title: "Erro ao cancelar", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Assinatura cancelada", description: "Seu número foi desconectado da automação." });
    navigate("/subscription-cancelled");
  };

  const noErrors: Record<string, string> = {};

  return (
    <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-display font-bold text-foreground">Configurações</h1>
          {subStatus === "active" && (
            <Badge className="bg-success/10 text-success border-success/20">Assinatura Ativa</Badge>
          )}
          {subStatus === "cancelled" && (
            <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">Cancelada</Badge>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving} className="font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </div>

      {/* Cancel subscription section */}
      {subStatus === "active" && (
        <div className="pt-2">
          <CancelSubscriptionDialog onConfirm={handleCancelSubscription} cancelling={cancelling} />
        </div>
      )}

      <Tabs defaultValue="shop" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="shop">Dados</TabsTrigger>
          <TabsTrigger value="hours">Horários</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-6">
          <StepWhatsApp data={data} onChange={updateData} />
        </TabsContent>
        <TabsContent value="shop" className="mt-6">
          <StepPetShopData data={data} onChange={updateData} errors={noErrors} />
        </TabsContent>
        <TabsContent value="hours" className="mt-6">
          <StepBusinessHours data={data} onChange={updateData} />
        </TabsContent>
        <TabsContent value="services" className="mt-6">
          <StepServices data={data} onChange={updateData} errors={noErrors} />
        </TabsContent>
        <TabsContent value="ai" className="mt-6">
          <StepPersonalization data={data} onChange={updateData} errors={noErrors} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
