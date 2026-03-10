import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Clock, User, Scissors } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import agendaPreview from "@/assets/agenda-preview.png";

const highlights = [
  "Agendamentos automáticos pelo WhatsApp",
  "Visão semanal com status em tempo real",
  "Confirmações e lembretes inteligentes",
];

const mockAppointments = [
  { name: "Lucas Silva", time: "09:00", service: "Corte + Barba", status: "confirmed" as const },
  { name: "Pedro Santos", time: "10:30", service: "Corte Degradê", status: "confirmed" as const },
  { name: "Rafael Oliveira", time: "14:00", service: "Barba", status: "pending" as const },
  { name: "João Costa", time: "15:30", service: "Corte Social", status: "confirmed" as const },
];

const statusConfig = {
  confirmed: { label: "Confirmado", className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20" },
  pending: { label: "Pendente", className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" },
};

const MobileAgendaMockup = () => (
  <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
    {/* Header */}
    <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">Agenda de Hoje</span>
      </div>
      <span className="text-xs text-muted-foreground">Terça, 10 Mar</span>
    </div>

    {/* Appointments */}
    <div className="divide-y divide-border">
      {mockAppointments.map((apt) => (
        <div key={apt.name} className="px-4 py-3 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 flex-shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{apt.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" /> {apt.time}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Scissors className="w-3 h-3" /> {apt.service}
              </span>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium border ${statusConfig[apt.status].className}`}>
            {statusConfig[apt.status].label}
          </Badge>
        </div>
      ))}
    </div>

    {/* Footer */}
    <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between">
      <span className="text-xs text-muted-foreground">4 agendamentos hoje</span>
      <span className="text-xs font-medium text-primary">Ver semana →</span>
    </div>
  </div>
);

const DesktopScreenshot = () => (
  <div className="relative mx-auto">
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
  </div>
);

const AgendaPreviewSection = () => {
  const isMobile = useIsMobile();

  return (
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

        {/* Content: Mobile mockup or Desktop screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15, type: "spring", stiffness: 80 }}
        >
          {isMobile ? <MobileAgendaMockup /> : <DesktopScreenshot />}
        </motion.div>
      </div>
    </section>
  );
};

export default AgendaPreviewSection;
