import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import agendaPreview from "@/assets/agenda-preview.png";

const highlights = [
  "Agendamentos automáticos pelo WhatsApp",
  "Visão semanal com status em tempo real",
  "Confirmações e lembretes inteligentes",
];

const AgendaPreviewSection = () => (
  <section className="py-16 px-4 bg-background">
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <Badge variant="outline" className="mb-4 text-sm px-4 py-1.5 border-primary/30 text-primary bg-primary/5 font-medium rounded-full">
          <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> Painel do barbeiro
        </Badge>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          Sua agenda sempre <span className="text-primary">organizada</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
          Enquanto a IA atende e agenda, você acompanha tudo em tempo real no painel
        </p>
      </motion.div>

      {/* Highlights */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex flex-wrap justify-center gap-4 mb-10"
      >
        {highlights.map((h) => (
          <div key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            <span>{h}</span>
          </div>
        ))}
      </motion.div>

      {/* Screenshot with device frame effect */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.15, type: "spring", stiffness: 80 }}
        className="relative mx-auto"
      >
        {/* Glow behind */}
        <div className="absolute inset-4 bg-primary/5 rounded-3xl blur-2xl" />
        
        <div className="relative rounded-2xl border border-border shadow-2xl shadow-primary/5 overflow-hidden bg-card">
          {/* Browser bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <div className="flex-1 mx-8">
              <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center max-w-xs mx-auto">
                app.secretariadigital.com/agenda
              </div>
            </div>
          </div>
          
          <img
            src={agendaPreview}
            alt="Painel de agenda da Secretária Digital mostrando agendamentos organizados por dia da semana"
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
      </motion.div>
    </div>
  </section>
);

export default AgendaPreviewSection;
