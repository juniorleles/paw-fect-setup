import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const TESTIMONIALS = [
  { name: "Carla M.", niche: "Salão de Beleza", text: "Reduzi 80% das ligações e minha agenda nunca esteve tão organizada!", stars: 5 },
  { name: "Dr. Ricardo S.", niche: "Clínica", text: "Meus pacientes adoram a praticidade de agendar pelo WhatsApp.", stars: 5 },
  { name: "Pedro L.", niche: "Barbearia", text: "Parece que tenho uma recepcionista de verdade. Clientes ficam impressionados.", stars: 5 },
  { name: "Ana P.", niche: "Estética", text: "As faltas caíram drasticamente com os lembretes automáticos.", stars: 5 },
];

const stats = [
  { value: "5.000+", label: "Atendimentos automatizados" },
  { value: "80%", label: "Menos faltas" },
  { value: "24h", label: "Disponibilidade" },
];

const TestimonialsSection = () => (
  <section id="depoimentos" className="py-24 px-4">
    <div className="max-w-6xl mx-auto">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Resultados reais de quem usa</h2>
        <p className="text-muted-foreground text-lg">Pequenos e médios negócios que transformaram seu atendimento</p>
      </motion.div>

      {/* Stats bar */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-wrap justify-center gap-6 mb-14">
        {stats.map((s) => (
          <Badge key={s.label} variant="secondary" className="px-6 py-3 text-base font-bold gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {s.value} {s.label}
          </Badge>
        ))}
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {TESTIMONIALS.map((t, i) => (
          <motion.div key={t.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }}>
            <Card className="h-full border-none shadow-md">
              <CardContent className="p-6">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 italic">"{t.text}"</p>
                <div>
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.niche}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
