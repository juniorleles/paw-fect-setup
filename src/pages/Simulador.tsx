import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import WhatsAppMockup from "@/components/landing/WhatsAppMockup";

const Simulador = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
    {/* Decorative background */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.2)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.2)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
    </div>

    <div className="relative w-full max-w-lg space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
          <Sparkles className="w-4 h-4" />
          Simulação gratuita
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Teste a <span className="text-primary">Secretária Digital</span> com IA
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Converse com a IA e veja como ela atende seus clientes no WhatsApp
        </p>
      </motion.div>

      {/* Simulator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
      >
        <WhatsAppMockup embedded />
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-center space-y-3"
      >
        <a href="/auth?signup=true&plan=free" onClick={() => {
          if (window.gtag) {
            window.gtag('event', 'conversion', {
              'send_to': 'AW-18051605915/iwNbCN_wvZIcEJvL1p9D',
              'value': 1.0,
              'currency': 'BRL'
            });
          }
        }}>
          <Button size="lg" className="h-12 px-8 text-sm font-bold rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/25">
            Testar grátis agora <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </a>
        <p className="text-xs text-muted-foreground">
          Sem cartão de crédito • Configuração em minutos
        </p>
      </motion.div>
    </div>
  </div>
);

export default Simulador;
