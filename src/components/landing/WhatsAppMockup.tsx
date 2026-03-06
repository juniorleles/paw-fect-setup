import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Send, Bot, Loader2, Zap, CalendarDays, Clock, CheckCircle2, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

// Tomorrow date for the script
const tomorrow = addDays(new Date(), 1);
const tomorrowStr = format(tomorrow, "dd/MM");
const tomorrowFull = format(tomorrow, "yyyy-MM-dd");

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

interface SimAppointment {
  id: string;
  time: string;
  service: string;
  clientName: string;
  status: "confirmed" | "pending";
}

// Scripted conversation for barbearia
const SCRIPT: { role: "user" | "assistant"; content: string; delay: number }[] = [
  { role: "user", content: "Oi! Quanto custa um corte masculino?", delay: 800 },
  { role: "assistant", content: `Olá! 😊 Bem-vindo à Barbearia! O corte masculino custa R$ 45 e leva cerca de 30 minutos.\n\nDeseja agendar um horário?`, delay: 1500 },
  { role: "user", content: "Quero! Tem vaga amanhã à tarde?", delay: 1000 },
  { role: "assistant", content: `Temos sim! Para amanhã (${tomorrowStr}), temos os seguintes horários disponíveis:\n\n• 13:00\n• 14:00\n• 15:30\n• 16:00\n\nQual prefere?`, delay: 1800 },
  { role: "user", content: "14h!", delay: 800 },
  { role: "assistant", content: `Pronto! ✅ Agendamento confirmado:\n\n📋 Corte Masculino\n📅 Amanhã (${tomorrowStr}) às 14:00\n💰 R$ 45,00\n\nEnviarei um lembrete 24h antes. Até lá! 💈`, delay: 2000 },
];

// Pre-existing appointments on the agenda
const EXISTING_APPOINTMENTS: SimAppointment[] = [
  { id: "e1", time: "09:00", service: "Barba", clientName: "João S.", status: "confirmed" },
  { id: "e2", time: "10:00", service: "Corte + Barba", clientName: "Pedro M.", status: "confirmed" },
  { id: "e3", time: "11:30", service: "Corte Masculino", clientName: "Lucas R.", status: "pending" },
];

const NEW_APPOINTMENT: SimAppointment = {
  id: "new1",
  time: "14:00",
  service: "Corte Masculino",
  clientName: "Visitante",
  status: "confirmed",
};

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

const now = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Simulator config for AI calls
const DEMO_CONFIG = {
  shopName: "Barbearia Demo",
  assistantName: "Luna",
  voiceTone: "friendly",
  niche: "barbearia",
  services: [
    { name: "Corte Masculino", price: 45, duration: 30 },
    { name: "Barba", price: 30, duration: 20 },
    { name: "Corte + Barba", price: 65, duration: 50 },
    { name: "Pigmentação", price: 80, duration: 40 },
  ],
  businessHours: [
    { day: "segunda", open: "09:00", close: "19:00" },
    { day: "terça", open: "09:00", close: "19:00" },
    { day: "quarta", open: "09:00", close: "19:00" },
    { day: "quinta", open: "09:00", close: "19:00" },
    { day: "sexta", open: "09:00", close: "19:00" },
    { day: "sábado", open: "09:00", close: "17:00" },
  ],
  address: "Rua Exemplo, 123",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
};

// ─── TYPING INDICATOR ───
const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="bg-card text-card-foreground rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 border">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Luna está digitando...
      </div>
    </div>
  </div>
);

// ─── AGENDA COMPONENT ───
const SimulatedAgenda = ({ appointments, showNew }: { appointments: SimAppointment[]; showNew: boolean }) => {
  const allApts = [...appointments, ...(showNew ? [NEW_APPOINTMENT] : [])];
  const aptByHour = new Map<number, SimAppointment>();
  allApts.forEach((a) => aptByHour.set(parseInt(a.time.split(":")[0]), a));

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Agenda</p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {format(tomorrow, "EEEE, dd 'de' MMM", { locale: ptBR })}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
          Dia
        </Badge>
      </div>

      {/* Time slots */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-border/30">
          {HOURS.map((hour) => {
            const apt = aptByHour.get(hour);
            const isNew = apt?.id === "new1";
            return (
              <div key={hour} className="flex min-h-[44px]">
                <div className="w-12 flex-shrink-0 text-[10px] text-muted-foreground font-medium p-1.5 text-right border-r border-border/30">
                  {String(hour).padStart(2, "0")}:00
                </div>
                <div className="flex-1 p-1">
                  {apt && (
                    <motion.div
                      initial={isNew ? { opacity: 0, scale: 0.8, y: 5 } : false}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={isNew ? { duration: 0.5, type: "spring", stiffness: 200 } : undefined}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-medium ${
                        apt.status === "confirmed"
                          ? "bg-success/15 text-success border border-success/30"
                          : "bg-accent/15 text-accent border border-accent/30"
                      } ${isNew ? "ring-2 ring-primary/30 ring-offset-1" : ""}`}
                    >
                      <div className="flex items-center gap-1">
                        {apt.status === "confirmed" ? (
                          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 flex-shrink-0" />
                        )}
                        <span className="font-bold">{apt.time.slice(0, 5)}</span>
                        <span className="truncate">{apt.clientName}</span>
                      </div>
                      <p className="text-[9px] mt-0.5 opacity-80 pl-4">{apt.service}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───
const WhatsAppMockup = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [scriptStep, setScriptStep] = useState(0);
  const [scriptDone, setScriptDone] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const [showNewApt, setShowNewApt] = useState(false);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showTyping]);

  // Scripted conversation
  useEffect(() => {
    if (!started || scriptDone) return;
    if (scriptStep >= SCRIPT.length) {
      setScriptDone(true);
      // Show new appointment on agenda
      setShowNewApt(true);
      return;
    }

    const step = SCRIPT[scriptStep];
    const isBot = step.role === "assistant";

    if (isBot) {
      setShowTyping(true);
      const timer = setTimeout(() => {
        setShowTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: `script-${scriptStep}`, role: "assistant", content: step.content, time: now() },
        ]);
        setScriptStep((s) => s + 1);
      }, step.delay);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `script-${scriptStep}`, role: "user", content: step.content, time: now() },
        ]);
        setScriptStep((s) => s + 1);
      }, step.delay);
      return () => clearTimeout(timer);
    }
  }, [started, scriptStep, scriptDone]);

  // Show appointment when last message appears
  useEffect(() => {
    if (scriptDone && messages.length === SCRIPT.length) {
      const timer = setTimeout(() => setShowNewApt(true), 600);
      return () => clearTimeout(timer);
    }
  }, [scriptDone, messages.length]);

  // AI message handler for post-script free typing
  const sendMessage = async (text: string) => {
    if (!text.trim() || aiLoading) return;
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      time: now(),
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setAiLoading(true);

    try {
      const { data: result, error } = await supabase.functions.invoke("chat-simulator", {
        body: {
          config: DEMO_CONFIG,
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          simulatedAppointments: [],
        },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: result.reply, time: now() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Desculpe, houve um erro. Tente novamente!", time: now() },
      ]);
    } finally {
      setAiLoading(false);
      inputRef.current?.focus();
    }
  };

  const QUICK_PROMPTS = [
    { label: "Perguntar preços", msg: "Quais serviços vocês oferecem e quanto custa?" },
    { label: "Horário de funcionamento", msg: "Qual o horário de funcionamento?" },
    { label: "Agendar outro serviço", msg: "Quero agendar uma barba para amanhã às 16h" },
  ];

  return (
    <section className="py-20 px-4 bg-secondary/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">Veja como funciona na prática</h2>
          <p className="text-muted-foreground text-lg">Assista a IA atender e agendar — depois, converse com ela você mesmo</p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.6, delay: 0.1 }}
          onAnimationComplete={() => setStarted(true)}
          className="grid lg:grid-cols-[1fr_340px] gap-5 items-stretch"
        >
          {/* ─── LEFT: WhatsApp Chat ─── */}
          <div className="bg-secondary rounded-2xl overflow-hidden shadow-lg border border-border/60 flex flex-col">
            {/* WhatsApp header */}
            <div className="bg-primary px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-bold text-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-primary-foreground font-bold text-sm">Luna • Barbearia Demo</p>
                <div className="flex items-center gap-1.5">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-primary-foreground/70"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <p className="text-primary-foreground/70 text-xs">online</p>
                </div>
              </div>
              <Badge className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 text-[10px]">
                <Zap className="w-3 h-3 mr-1" /> Simulação
              </Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ minHeight: 360, maxHeight: 480 }}>
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card text-card-foreground rounded-bl-sm shadow-sm border"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Bot className="w-3 h-3 text-primary" />
                          <span className="text-xs font-semibold text-primary">Luna</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-primary/30 text-primary">
                            IA
                          </Badge>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <p
                        className={`text-[10px] mt-1 text-right ${
                          msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                        }`}
                      >
                        {msg.time}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {(showTyping || aiLoading) && <TypingIndicator />}
              <div ref={scrollRef} />
            </div>

            {/* Post-script: free typing + quick prompts */}
            {scriptDone && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t border-border/50 p-3 space-y-2 bg-card/50"
              >
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Teste:
                  </span>
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => sendMessage(p.msg)}
                      disabled={aiLoading}
                      className="text-[10px] px-2.5 py-1 rounded-full border bg-card hover:bg-secondary transition-colors disabled:opacity-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Digite uma mensagem..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                    disabled={aiLoading}
                    className="h-9 text-sm flex-1"
                  />
                  <Button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || aiLoading}
                    size="icon"
                    className="h-9 w-9 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* ─── RIGHT: Animated Agenda ─── */}
          <div className="hidden lg:block">
            <SimulatedAgenda appointments={EXISTING_APPOINTMENTS} showNew={showNewApt} />
          </div>
        </motion.div>

        {/* Mobile-only: show agenda below */}
        <div className="lg:hidden mt-5">
          <AnimatePresence>
            {showNewApt && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <SimulatedAgenda appointments={EXISTING_APPOINTMENTS} showNew={showNewApt} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default WhatsAppMockup;
