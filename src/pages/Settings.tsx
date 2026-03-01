import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingData, INITIAL_DATA } from "@/types/onboarding";
import { useSubscription } from "@/hooks/useSubscription";
import { STRIPE_PLANS } from "@/config/stripe";
import StepWhatsApp from "@/components/onboarding/StepWhatsApp";
import StepBusinessData from "@/components/onboarding/StepBusinessData";
import StepBusinessHours from "@/components/onboarding/StepBusinessHours";
import StepServices from "@/components/onboarding/StepServices";
import StepPersonalization from "@/components/onboarding/StepPersonalization";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import WhatsAppStatusCard from "@/components/dashboard/WhatsAppStatusCard";

const Settings = () => {
  const { user } = useAuth();
  const { plan: subscriptionPlan } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
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
          niche: (c as any).niche ?? "petshop",
          shopName: c.shop_name,
          address: c.address,
          neighborhood: c.neighborhood,
          city: c.city,
          state: c.state,
          businessHours: c.business_hours as unknown as OnboardingData["businessHours"],
          services: c.services as unknown as OnboardingData["services"],
          voiceTone: c.voice_tone as OnboardingData["voiceTone"],
          assistantName: c.assistant_name,
          maxConcurrentAppointments: (c as any).max_concurrent_appointments ?? 1,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const saveToDb = useCallback(async (dataToSave: OnboardingData) => {
    if (!user || !configId) return;
    setSaving(true);
    const { error } = await supabase
      .from("pet_shop_configs")
      .update({
        phone: dataToSave.phone,
        phone_verified: dataToSave.phoneVerified,
        niche: dataToSave.niche,
        shop_name: dataToSave.shopName,
        address: dataToSave.address,
        neighborhood: dataToSave.neighborhood,
        city: dataToSave.city,
        state: dataToSave.state,
        business_hours: dataToSave.businessHours as any,
        services: dataToSave.services as any,
        voice_tone: dataToSave.voiceTone,
        assistant_name: dataToSave.assistantName,
        max_concurrent_appointments: Math.min(
          dataToSave.maxConcurrentAppointments,
          subscriptionPlan === "professional" ? STRIPE_PLANS.professional.maxAttendants : STRIPE_PLANS.starter.maxAttendants
        ),
      })
      .eq("id", configId);
    setSaving(false);
    if (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Configurações salvas!", description: "Todas as alterações foram aplicadas." });
  }, [user, configId, subscriptionPlan, toast]);

  // Auto-save with debounce — only after user actually changes something
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedDataRef = useRef<string | null>(null);

  // Snapshot the data as loaded from DB so we can detect real changes
  useEffect(() => {
    if (!loading && configId) {
      loadedDataRef.current = JSON.stringify(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, configId]);

  useEffect(() => {
    if (loading || !configId) return;
    // Skip if data hasn't changed from what was loaded
    if (loadedDataRef.current && JSON.stringify(data) === loadedDataRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveToDb(data);
      // Update snapshot after save so subsequent no-ops don't re-trigger
      loadedDataRef.current = JSON.stringify(data);
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [data, configId, loading, saveToDb]);

  const handleSave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveToDb(data);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const noErrors: Record<string, string> = {};

  return (
    <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-display font-bold text-foreground">Configurações</h1>
        </div>
        <Button onClick={handleSave} disabled={saving} className="font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </div>


      <Tabs defaultValue="shop" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="shop">Dados</TabsTrigger>
          <TabsTrigger value="hours">Horários</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-6 space-y-4">
          <WhatsAppStatusCard />
          <StepWhatsApp data={data} onChange={updateData} />
        </TabsContent>
        <TabsContent value="shop" className="mt-6">
          <StepBusinessData data={data} onChange={updateData} errors={noErrors} showEmail />
        </TabsContent>
        <TabsContent value="hours" className="mt-6">
          <StepBusinessHours data={data} onChange={updateData} plan={subscriptionPlan} />
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
