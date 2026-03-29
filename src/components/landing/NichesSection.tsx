import { Card, CardContent } from "@/components/ui/card";
import {
  Briefcase, PawPrint, Stethoscope, Scissors, Sparkles,
  Building2,
} from "lucide-react";
import { motion } from "framer-motion";
import { NICHE_LABELS } from "@/types/onboarding";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const NICHE_ICONS: Record<string, React.ElementType> = {
  petshop: PawPrint, clinica: Stethoscope, salao: Scissors,
  barbearia: Scissors, estetica: Sparkles, escritorio: Building2,
  veterinaria: Stethoscope, outros: Briefcase,
};

const NichesSection = () => {
  const nicheKeys = Object.keys(NICHE_LABELS) as (keyof typeof NICHE_LABELS)[];

  return (
    <section id="nichos" className="py-24 px-4 bg-secondary/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">
            Funciona para o <span className="text-primary">seu</span> negócio
          </h2>
          <p className="text-muted-foreground text-lg">Adapta-se automaticamente ao seu segmento</p>
        </motion.div>
        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-4">
          {nicheKeys.map((key, i) => {
            const Icon = NICHE_ICONS[key] || Briefcase;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <Card className="text-center rounded-xl sm:rounded-2xl border border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-default">
                  <CardContent className="p-2 sm:p-5">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 mx-auto rounded-xl sm:rounded-2xl bg-primary/8 flex items-center justify-center mb-1.5 sm:mb-3">
                      <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
                    </div>
                    <p className="font-semibold text-[11px] sm:text-sm leading-tight">{NICHE_LABELS[key]}</p>
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
