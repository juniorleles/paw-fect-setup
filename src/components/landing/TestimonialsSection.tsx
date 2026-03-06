import { Card, CardContent } from "@/components/ui/card";
import { Star, TrendingUp, Quote } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const TESTIMONIALS = [
  { name: "Carla M.", niche: "Salão de Beleza", text: "Reduzi 80% das ligações e minha agenda nunca esteve tão organizada!", stars: 5, avatar: "CM" },
  { name: "Dr. Ricardo S.", niche: "Clínica", text: "Meus pacientes adoram a praticidade de agendar pelo WhatsApp.", stars: 5, avatar: "RS" },
  { name: "Pedro L.", niche: "Barbearia", text: "Parece que tenho uma recepcionista de verdade. Clientes ficam impressionados.", stars: 5, avatar: "PL" },
  { name: "Ana P.", niche: "Estética", text: "As faltas caíram drasticamente com os lembretes automáticos.", stars: 5, avatar: "AP" },
];

const stats = [
  { value: "5.000+", label: "Atendimentos automatizados" },
  { value: "80%", label: "Menos faltas" },
  { value: "24h", label: "Disponibilidade" },
];

const TestimonialsSection = () => (
  <section id="depoimentos" className="py-24 px-4">
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">
          Resultados reais de quem usa
        </h2>
        <p className="text-muted-foreground text-lg">Pequenos e médios negócios que transformaram seu atendimento</p>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-14"
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/5 border border-primary/10 text-sm font-semibold"
          >
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>{s.value} {s.label}</span>
          </div>
        ))}
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="h-full rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <Quote className="w-7 h-7 text-primary/15 mb-3" />
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary/80 text-primary/80" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-xs font-bold text-primary">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.niche}</p>
                  </div>
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
