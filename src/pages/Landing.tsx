import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import AboutSection from "@/components/landing/AboutSection";
import AgendaPreviewSection from "@/components/landing/AgendaPreviewSection";
import PainSolutionSection from "@/components/landing/PainSolutionSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import NichesSection from "@/components/landing/NichesSection";
import MetricsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";

const Landing = () => {
  const { user, loading } = useAuth();
  const { completed, loading: onboardingLoading } = useOnboardingStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !onboardingLoading && user) {
      if (completed) {
        navigate("/dashboard", { replace: true });
      }
      // If onboarding not completed, stay on landing page
    }
  }, [loading, onboardingLoading, user, completed, navigate]);

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden">
      <LandingNavbar />
      <LandingHero />
      <AboutSection />
      <AgendaPreviewSection />
      <PainSolutionSection />
      <HowItWorksSection />
      <NichesSection />
      <MetricsSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <LandingFooter />
    </div>
  );
};

export default Landing;
