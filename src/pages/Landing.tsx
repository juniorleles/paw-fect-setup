import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import WhatsAppMockup from "@/components/landing/WhatsAppMockup";
import PainSolutionSection from "@/components/landing/PainSolutionSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import NichesSection from "@/components/landing/NichesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import FaqSection from "@/components/landing/FaqSection";
import ContactSection from "@/components/landing/ContactSection";
import LandingFooter from "@/components/landing/LandingFooter";

const Landing = () => (
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
    <ContactSection />
    <LandingFooter />
  </div>
);

export default Landing;
