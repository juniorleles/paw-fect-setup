import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import ProgressBar from "@/components/onboarding/ProgressBar";
import StepWhatsApp from "@/components/onboarding/StepWhatsApp";
import StepBusinessData from "@/components/onboarding/StepBusinessData";
import StepBusinessHours from "@/components/onboarding/StepBusinessHours";
import StepServices from "@/components/onboarding/StepServices";
import StepPersonalization from "@/components/onboarding/StepPersonalization";
import StepSimulator from "@/components/onboarding/StepSimulator";
import SuccessScreen from "@/components/onboarding/SuccessScreen";
import { OnboardingData, INITIAL_DATA } from "@/types/onboarding";
import { ArrowLeft, ArrowRight, Zap, Briefcase, LogOut, Loader2, Copy, Check, CreditCard } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { STRIPE_PLANS, type StripePlanKey } from "@/config/stripe";

const Index = () => {
  const { user, signOut } = useAuth();
  const { plan: subscriptionPlan, status: subStatus, refetch: refetchSubscription } = useSubscription();
  const { refetch: refetchOnboarding } = useOnboardingStatus();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialStep = (location.state as any)?.step ?? 1;
  const [step, setStep] = useState(initialStep);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activated, setActivated] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activatingAfterCheckout, setActivatingAfterCheckout] = useState(false);
  
  const isMobile = useIsMobile();
  const [configId, setConfigId] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Determine the chosen plan (from localStorage, set during signup)
  const chosenPlan = localStorage.getItem("chosen_plan") || "free";
  const isPaidPlan = chosenPlan === "starter" || chosenPlan === "professional";
  // If user already has an active paid subscription, skip paywall
  const hasPaidSubscription = subStatus === "active" && (subscriptionPlan === "starter" || subscriptionPlan === "professional");
  const needsPayment = isPaidPlan && !hasPaidSubscription;

  // Handle checkout success return (via URL param OR localStorage fallback after re-login)
  // Auto-activate and redirect to dashboard
  useEffect(() => {
    const checkoutResult = searchParams.get("checkout");
    const checkoutPending = localStorage.getItem("checkout_pending");

    if (checkoutResult !== "success" && !checkoutPending) return;
    // Wait for config to be loaded before activating
    if (!configLoaded) return;

    // Show full-screen loading immediately
    setActivatingAfterCheckout(true);

    // Clear all checkout state
    localStorage.removeItem("checkout_pending");
    localStorage.removeItem("chosen_plan");
    if (checkoutResult) {
      window.history.replaceState({}, "", location.pathname);
    }

    const autoActivate = async () => {
      try {
        // 1. Sync subscription status
        await refetchSubscription();

        // 2. Save config as activated (use current data state which is loaded from DB)
        if (user) {
          const cId = configId;
          if (cId) {
            await supabase.from("pet_shop_configs").update({ activated: true }).eq("id", cId);
          } else {
            await saveConfig(data, true);
          }
        }

        // 3. Call activate-subscription to create Evolution instance
        if (user) {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session?.access_token) {
            const { error } = await supabase.functions.invoke("activate-subscription", {
              method: "POST",
            });
            if (error) console.error("Activate subscription error:", error);
          }
        }

        // 4. Refresh onboarding/subscription state
        await Promise.all([refetchOnboarding(), refetchSubscription()]);

        toast({ title: "Secretária ativada!", description: "Seu pagamento foi confirmado e sua secretária já está funcionando." });

        // 5. Redirect to dashboard
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Auto-activate error:", err);
        setActivatingAfterCheckout(false);
        setStep(6);
        toast({
          title: "Pagamento confirmado",
          description: "Clique em 'Ativar Secretária' para finalizar.",
        });
      }
    };

    autoActivate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, configLoaded]);

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
          phoneVerified: false,
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
        if (c.activated) {
          navigate("/dashboard", { replace: true });
          return;
        }
      }
      setConfigLoaded(true);
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
      niche: updatedData.niche,
      shop_name: updatedData.shopName,
      address: updatedData.address,
      neighborhood: updatedData.neighborhood,
      city: updatedData.city,
      state: updatedData.state,
      business_hours: updatedData.businessHours as any,
      services: updatedData.services as any,
      voice_tone: updatedData.voiceTone,
      assistant_name: updatedData.assistantName,
      max_concurrent_appointments: updatedData.maxConcurrentAppointments,
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
    if (step === 4) {
      if (data.services.length === 0) {
        errs.services = "Adicione pelo menos 1 serviço";
      } else {
        const incomplete = data.services.filter(s => !s.price || !s.duration);
        if (incomplete.length > 0) {
          errs.services = `Preencha o valor e a duração de todos os serviços: ${incomplete.map(s => s.name).join(", ")}`;
        }
      }
    }
    if (step === 5 && !data.assistantName.trim()) {
      errs.assistantName = "Dê um nome à sua secretária";
    }
    // Step 6 (simulator) has no validation
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = async () => {
    if (!validate()) return;
    setCompletedSteps((prev) => [...new Set([...prev, step])]);
    await saveConfig(data);
    if (step < 6) setStep(step + 1);
  };

  const goBack = () => step > 1 && setStep(step - 1);

  const redirectToExternalUrl = useCallback((url: string) => {
    const inIframe = window.self !== window.top;

    if (inIframe) {
      const opened = window.open(url, "_top");
      if (opened) return;
    }

    window.location.assign(url);
  }, []);

  const handleCheckout = async () => {
    if (!acceptedTerms) {
      toast({
        title: "Termos obrigatórios",
        description: "Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.",
        variant: "destructive",
      });
      return;
    }
    setCheckoutLoading(true);
    await saveConfig(data); // Save config before redirecting
    try {
      // Persist checkout state so we can restore Step 6 after Stripe redirect + re-login
      localStorage.setItem("checkout_pending", "true");

      const { data: result, error } = await supabase.functions.invoke("create-checkout", {
        body: { planKey: chosenPlan },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      if (result?.url) {
        redirectToExternalUrl(result.url);
      }
    } catch (e: any) {
      localStorage.removeItem("checkout_pending");
      console.error("Checkout error:", e);
      toast({ title: "Erro", description: "Não foi possível iniciar o pagamento. Tente novamente.", variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleActivate = async () => {
    // Final validation: ensure ALL steps are complete (not just current step)
    const allStepsValid = data.phoneVerified &&
      data.shopName.trim() &&
      data.address.trim() &&
      data.neighborhood.trim() &&
      data.city.trim() &&
      data.state &&
      data.services.length > 0 &&
      data.services.every(s => s.price && s.duration) &&
      data.assistantName.trim();

    if (!allStepsValid) {
      toast({
        title: "Onboarding incompleto",
        description: "Complete todas as etapas antes de ativar sua secretária.",
        variant: "destructive",
      });
      return;
    }
    if (!validate()) return;
    if (!acceptedTerms) {
      toast({
        title: "Termos obrigatórios",
        description: "Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.",
        variant: "destructive",
      });
      return;
    }
    setCompletedSteps((prev) => [...new Set([...prev, 6])]);
    await saveConfig(data, true);

    // Activate subscription and create per-user Evolution instance
    if (user) {
      // Refresh session to ensure valid token before calling edge function
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData?.session?.access_token) {
        console.warn("No valid session - skipping activate-subscription call.", refreshError);
        await Promise.all([refetchOnboarding(), refetchSubscription()]);
        setActivated(true);
        toast({ title: "Secretária configurada!", description: "Faça login novamente para conectar o WhatsApp." });
        return;
      }

      try {
        const { data: result, error } = await supabase.functions.invoke("activate-subscription", {
          method: "POST",
        });
        if (error) {
          console.error("Activate subscription error:", error);
          await Promise.all([refetchOnboarding(), refetchSubscription()]);
          toast({ title: "Aviso", description: "Configuração salva. Conecte o WhatsApp pelo Dashboard.", variant: "default" });
          setActivated(true);
          return;
        }
        if (result?.error) {
          console.error("Activate result error:", result.error);
          await Promise.all([refetchOnboarding(), refetchSubscription()]);
          toast({ title: "Aviso", description: "Configuração salva. Conecte o WhatsApp pelo Dashboard.", variant: "default" });
          setActivated(true);
          return;
        }
        console.log("Subscription activated:", result);
      } catch (e: any) {
        console.error("Activate error:", e);
        await Promise.all([refetchOnboarding(), refetchSubscription()]);
        toast({ title: "Aviso", description: "Configuração salva. Conecte o WhatsApp pelo Dashboard.", variant: "default" });
        setActivated(true);
        return;
      }
    }

    localStorage.removeItem("chosen_plan");
    await Promise.all([refetchOnboarding(), refetchSubscription()]);
    setActivated(true);
    toast({ title: "Secretária ativada!", description: "Sua instância WhatsApp foi criada com sucesso." });
  };

  if (activatingAfterCheckout) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">Ativando sua secretária...</p>
        <p className="text-sm text-muted-foreground">Aguarde enquanto configuramos tudo para você.</p>
      </div>
    );
  }

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
            <Briefcase className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-display font-bold text-foreground">
              Secretária <span className="text-primary">Digital</span>
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
              {step === 2 && <StepBusinessData data={data} onChange={updateData} errors={errors} />}
              {step === 3 && <StepBusinessHours data={data} onChange={updateData} plan={subscriptionPlan} />}
              {step === 4 && <StepServices data={data} onChange={updateData} errors={errors} />}
              {step === 5 && <StepPersonalization data={data} onChange={updateData} errors={errors} />}
              {step === 6 && <StepSimulator data={data} acceptedTerms={acceptedTerms} onAcceptedTermsChange={setAcceptedTerms} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={goBack} disabled={step === 1} className="h-12 px-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>

          {step < 6 ? (
            <Button onClick={goNext} className="h-12 px-8 font-bold">
              Próximo <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : needsPayment ? (
            <Button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="h-12 px-8 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
              size="lg"
            >
              {checkoutLoading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Redirecionando...</>
              ) : (
                <><CreditCard className="w-5 h-5 mr-2" /> ASSINAR E ATIVAR — R${STRIPE_PLANS[chosenPlan as StripePlanKey]?.price}/mês</>
              )}
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
