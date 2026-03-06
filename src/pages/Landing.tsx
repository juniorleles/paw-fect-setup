import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import AgendaPreviewSection from "@/components/landing/AgendaPreviewSection";
import PainSolutionSection from "@/components/landing/PainSolutionSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";

import MetricsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background font-sans">
      <LandingNavbar />
      <LandingHero />
      <AgendaPreviewSection />
      <PainSolutionSection />
      <HowItWorksSection />
      
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <LandingFooter />
    </div>
  );
};

export default Landing;
