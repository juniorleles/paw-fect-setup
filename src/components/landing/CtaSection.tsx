import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const CtaSection = () => (
  <section className="py-24 px-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, type: "spring" }}
      className="max-w-4xl mx-auto relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-12 sm:p-16 text-center shadow-2xl"
    >
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary-foreground/5" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-primary-foreground/5" />

      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Sparkles className="w-10 h-10 text-primary-foreground/60 mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-4">
            Pronto para automatizar seu atendimento?
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Comece agora gratuitamente e veja seus clientes sendo atendidos 24 horas por dia, 7 dias por semana.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <a href="/auth?signup=true&plan=free">
            <Button
              size="lg"
              className="h-14 px-10 text-base font-bold bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-xl"
            >
              Começar 7 dias grátis <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </a>
          <p className="text-sm text-primary-foreground/60 mt-4">
            Sem cartão de crédito • Cancele quando quiser
          </p>
        </motion.div>
      </div>
    </motion.div>
  </section>
);

export default CtaSection;
