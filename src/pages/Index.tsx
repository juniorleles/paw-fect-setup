import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import ProgressBar from "@/components/onboarding/ProgressBar";
import StepWhatsApp from "@/components/onboarding/StepWhatsApp";
import StepPetShopData from "@/components/onboarding/StepPetShopData";
import StepBusinessHours from "@/components/onboarding/StepBusinessHours";
import StepServices from "@/components/onboarding/StepServices";
import StepPersonalization from "@/components/onboarding/StepPersonalization";
import SuccessScreen from "@/components/onboarding/SuccessScreen";
import { OnboardingData, INITIAL_DATA } from "@/types/onboarding";
import { ArrowLeft, ArrowRight, Zap, PawPrint, LogOut, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activated, setActivated] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Load existing config
  useEffect(() => {
    const loadConfig = async () => {
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
        if (c.activated) setActivated(true);
      }
      setLoadingConfig(false);
    };
    loadConfig();
  }, [user]);

  const saveConfig = useCallback(async (updatedData: OnboardingData, isActivated = false) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      phone: updatedData.phone,
      phone_verified: updatedData.phoneVerified,
      shop_name: updatedData.shopName,
      address: updatedData.address,
      neighborhood: updatedData.neighborhood,
      city: updatedData.city,
      state: updatedData.state,
      business_hours: updatedData.businessHours as any,
      services: updatedData.services as any,
      voice_tone: updatedData.voiceTone,
      assistant_name: updatedData.assistantName,
      activated: isActivated,
    };

    if (configId) {
      await supabase.from("pet_shop_configs").update(payload).eq("id", configId);
    } else {
      const { data: inserted } = await supabase.from("pet_shop_configs").insert(payload).select("id").single();
      if (inserted) setConfigId(inserted.id);
    }
  }, [user, configId]);

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => {
      const updated = { ...prev, ...partial };
      return updated;
    });
    setErrors({});
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1 && !data.phoneVerified) {
      errs.phone = "Verifique seu número primeiro";
    }
    if (step === 2) {
      if (!data.shopName.trim()) errs.shopName = "Campo obrigatório";
      if (!data.address.trim()) errs.address = "Campo obrigatório";
      if (!data.neighborhood.trim()) errs.neighborhood = "Campo obrigatório";
      if (!data.city.trim()) errs.city = "Campo obrigatório";
      if (!data.state) errs.state = "Selecione o estado";
    }
    if (step === 4 && data.services.length === 0) {
      errs.services = "Adicione pelo menos 1 serviço";
    }
    if (step === 5 && !data.assistantName.trim()) {
      errs.assistantName = "Dê um nome à sua secretária";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = async () => {
    if (!validate()) return;
    setCompletedSteps((prev) => [...new Set([...prev, step])]);
    await saveConfig(data);
    if (step < 5) setStep(step + 1);
  };

  const goBack = () => step > 1 && setStep(step - 1);

  const handleActivate = async () => {
    if (!validate()) return;
    setCompletedSteps((prev) => [...new Set([...prev, 5])]);
    await saveConfig(data, true);
    setActivated(true);
    toast({ title: "Secretária ativada!", description: "Dados salvos com sucesso." });
  };

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (activated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <SuccessScreen data={data} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <PawPrint className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-display font-bold text-foreground">
              Secretária <span className="text-primary">Pet</span>
            </h1>
          </div>
          <p className="text-muted-foreground">Configure sua secretária digital em minutos</p>
          <button
            onClick={signOut}
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3 h-3" /> Sair
          </button>
        </div>

        {/* Progress */}
        <ProgressBar currentStep={step} completedSteps={completedSteps} onStepClick={setStep} />

        {/* Step content */}
        <div className="mb-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {step === 1 && <StepWhatsApp data={data} onChange={updateData} />}
              {step === 2 && <StepPetShopData data={data} onChange={updateData} errors={errors} />}
              {step === 3 && <StepBusinessHours data={data} onChange={updateData} />}
              {step === 4 && <StepServices data={data} onChange={updateData} errors={errors} />}
              {step === 5 && <StepPersonalization data={data} onChange={updateData} errors={errors} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={goBack} disabled={step === 1} className="h-12 px-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>

          {step < 5 ? (
            <Button onClick={goNext} className="h-12 px-8 font-bold">
              Próximo <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleActivate}
              className="h-12 px-8 font-bold bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg"
              size="lg"
            >
              <Zap className="w-5 h-5 mr-2" /> ATIVAR SECRETÁRIA
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
