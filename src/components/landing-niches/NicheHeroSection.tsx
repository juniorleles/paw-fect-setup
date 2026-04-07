import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";

interface NicheHeroProps {
  badge: string;
  headline: React.ReactNode;
  subheadline: string;
  ctaText: string;
  benefits?: string[];
  nicheCallout?: string;
}

const NicheHeroSection = ({ badge, headline, subheadline, ctaText, benefits = ["Teste grátis", "Sem cartão", "Configuração em minutos"], nicheCallout }: NicheHeroProps) => (
  <section className="relative pt-20 pb-16 px-4 bg-background">
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
    </div>

    <div className="relative max-w-3xl mx-auto text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Badge variant="outline" className="mb-6 text-sm px-4 py-1.5 border-primary/30 text-primary bg-primary/5 font-medium rounded-full">
          {badge}
        </Badge>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold leading-[1.08] mb-6 tracking-tight"
      >
        {headline}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed"
      >
        {subheadline}
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="flex justify-center">
        <a href="/auth?signup=true&plan=free" onClick={() => {
          if (window.gtag) {
            window.gtag('event', 'conversion', { 'send_to': 'AW-18051605915/iwNbCN_wvZIcEJvL1p9D', 'value': 1.0, 'currency': 'BRL' });
          }
        }}>
          <Button size="lg" className="h-14 px-10 text-base font-bold rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-200">
            {ctaText} <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </a>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.55 }} className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-5">
        {benefits.map((b) => (
          <span key={b} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-primary" /> {b}
          </span>
        ))}
      </motion.div>

      {nicheCallout && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.65 }} className="text-sm font-semibold text-primary mt-6">
          {nicheCallout}
        </motion.p>
      )}
    </div>
  </section>
);

export default NicheHeroSection;
