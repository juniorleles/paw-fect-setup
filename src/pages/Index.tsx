import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import ProgressBar from "@/components/onboarding/ProgressBar";
import StepWhatsApp from "@/components/onboarding/StepWhatsApp";
import StepPetShopData from "@/components/onboarding/StepPetShopData";
import StepBusinessHours from "@/components/onboarding/StepBusinessHours";
import StepServices from "@/components/onboarding/StepServices";
import StepPersonalization from "@/components/onboarding/StepPersonalization";
import SuccessScreen from "@/components/onboarding/SuccessScreen";
import { OnboardingData, INITIAL_DATA } from "@/types/onboarding";
import { ArrowLeft, ArrowRight, Zap, PawPrint } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const Index = () => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activated, setActivated] = useState(false);

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
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

  const goNext = () => {
    if (!validate()) return;
    setCompletedSteps((prev) => [...new Set([...prev, step])]);
    if (step < 5) setStep(step + 1);
  };

  const goBack = () => step > 1 && setStep(step - 1);

  const handleActivate = () => {
    if (!validate()) return;
    setCompletedSteps((prev) => [...new Set([...prev, 5])]);
    setActivated(true);
  };

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
