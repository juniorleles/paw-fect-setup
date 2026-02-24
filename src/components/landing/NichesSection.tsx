import { Card, CardContent } from "@/components/ui/card";
import {
  Briefcase, Stethoscope, Scissors, Sparkles,
  Building2,
} from "lucide-react";
import { motion } from "framer-motion";
import { NICHE_LABELS } from "@/types/onboarding";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const NICHE_ICONS: Record<string, React.ElementType> = {
  clinica: Stethoscope, salao: Scissors,
  barbearia: Scissors, estetica: Sparkles, escritorio: Building2,
  veterinaria: Stethoscope, outros: Briefcase,
};

const NichesSection = () => {
  const nicheKeys = Object.keys(NICHE_LABELS) as (keyof typeof NICHE_LABELS)[];

  return (
    <section id="nichos" className="py-24 px-4 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Funciona para o seu negócio</h2>
          <p className="text-muted-foreground text-lg">Adapta-se automaticamente ao seu segmento</p>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {nicheKeys.map((key, i) => {
            const Icon = NICHE_ICONS[key] || Briefcase;
            return (
              <motion.div key={key} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.3, delay: i * 0.05 }}>
                <Card className="text-center border-none shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-default">
                  <CardContent className="p-5">
                    <div className="w-12 h-12 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-3">
                      <Icon className="w-6 h-6 text-accent" />
                    </div>
                    <p className="font-semibold text-sm">{NICHE_LABELS[key]}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default NichesSection;
