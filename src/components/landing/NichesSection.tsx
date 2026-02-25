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

const NICHE_COLORS: Record<string, string> = {
  petshop: "from-accent/15 to-accent/5",
  clinica: "from-primary/15 to-primary/5",
  salao: "from-pink-500/15 to-pink-500/5",
  barbearia: "from-amber-500/15 to-amber-500/5",
  estetica: "from-rose-500/15 to-rose-500/5",
  escritorio: "from-blue-500/15 to-blue-500/5",
  veterinaria: "from-green-500/15 to-green-500/5",
  outros: "from-gray-500/15 to-gray-500/5",
};

const NichesSection = () => {
  const nicheKeys = Object.keys(NICHE_LABELS) as (keyof typeof NICHE_LABELS)[];

  return (
    <section id="nichos" className="py-24 px-4 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">
            Funciona para o <span className="text-primary">seu</span> negócio
          </h2>
          <p className="text-muted-foreground text-lg">Adapta-se automaticamente ao seu segmento</p>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {nicheKeys.map((key, i) => {
            const Icon = NICHE_ICONS[key] || Briefcase;
            const gradient = NICHE_COLORS[key] || "from-gray-500/15 to-gray-500/5";
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06, type: "spring", stiffness: 150 }}
                whileHover={{ scale: 1.08, y: -4 }}
              >
                <Card className="text-center border-none shadow-sm hover:shadow-lg transition-all cursor-default">
                  <CardContent className="p-5">
                    <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
                      <Icon className="w-7 h-7 text-foreground/70" />
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
