import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import WhatsAppMockup from "@/components/landing/WhatsAppMockup";
import PainSolutionSection from "@/components/landing/PainSolutionSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import NichesSection from "@/components/landing/NichesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users (e.g. from magic link) to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background font-sans">
      <LandingNavbar />
      <LandingHero />
      <WhatsAppMockup />
      <PainSolutionSection />
      <HowItWorksSection />
      <NichesSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <LandingFooter />
    </div>
  );
};

export default Landing;
