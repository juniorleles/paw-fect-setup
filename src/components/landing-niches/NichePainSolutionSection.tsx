import { Card, CardContent } from "@/components/ui/card";
import { XCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const listItem = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

interface Props {
  title: string;
  subtitle: string;
  pains: string[];
  solutions: string[];
}

const NichePainSolutionSection = ({ title, subtitle, pains, solutions }: Props) => (
  <section id="beneficios" className="pt-12 pb-24 px-4 bg-secondary/50">
    <div className="max-w-5xl mx-auto">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-lg">{subtitle}</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 relative">
        <motion.div initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.6, duration: 0.4 }} className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 items-center justify-center">
          <ArrowRight className="w-6 h-6 text-primary-foreground" />
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="h-full rounded-2xl border border-destructive/15 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-8">
              <h3 className="font-bold text-xl mb-6 text-destructive">❌ Sem automação</h3>
              <ul className="space-y-4">
                {pains.map((p, i) => (
                  <motion.li key={p} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={listItem} className="flex items-start gap-3 text-muted-foreground">
                    <XCircle className="w-5 h-5 text-destructive/70 mt-0.5 flex-shrink-0" />
                    <span>{p}</span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="h-full rounded-2xl border border-primary/20 shadow-sm hover:shadow-md transition-shadow duration-300 bg-primary/[0.02]">
            <CardContent className="p-8">
              <h3 className="font-bold text-xl mb-6 text-primary">✨ Com a Secretária Digital</h3>
              <ul className="space-y-4">
                {solutions.map((s, i) => (
                  <motion.li key={s} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={listItem} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="font-medium">{s}</span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  </section>
);

export default NichePainSolutionSection;
