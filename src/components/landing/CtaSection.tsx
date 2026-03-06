import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const CtaSection = () => (
  <section className="py-24 px-4">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto relative overflow-hidden rounded-3xl bg-primary p-12 sm:p-16 text-center"
    >
      {/* Subtle pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_25%,rgba(255,255,255,0.05)_25%,rgba(255,255,255,0.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.05)_75%)] bg-[length:40px_40px]" />

      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary-foreground mb-4 tracking-tight">
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
              className="h-14 px-10 text-base font-bold bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-xl shadow-lg"
            >
              Testar grátis no meu WhatsApp <ArrowRight className="w-5 h-5 ml-2" />
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
