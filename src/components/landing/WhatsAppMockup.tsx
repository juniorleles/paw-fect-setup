import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Send, Bot, Loader2, Zap, CalendarDays, Clock, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const tomorrow = addDays(new Date(), 1);
const tomorrowStr = format(tomorrow, "dd/MM");

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

const SCRIPT: { role: "user" | "assistant"; content: string; delay: number }[] = [
  { role: "user", content: "Oi! Quanto custa um corte masculino?", delay: 800 },
  { role: "assistant", content: `Olá! 😊 O corte masculino custa R$ 45 (30 min).\n\nDeseja agendar?`, delay: 1500 },
  { role: "user", content: "Quero! Tem vaga amanhã à tarde?", delay: 1000 },
  { role: "assistant", content: `Temos! Para ${tomorrowStr}:\n\n• 13:00\n• 14:00\n• 15:30\n• 16:00\n\nQual prefere?`, delay: 1800 },
  { role: "user", content: "14h!", delay: 800 },
  { role: "assistant", content: `✅ Confirmado!\n\n📋 Corte Masculino\n📅 ${tomorrowStr} às 14:00\n💰 R$ 45\n\nEnviarei lembrete 24h antes! 💈`, delay: 2000 },
];

const EXISTING_APPOINTMENTS: SimAppointment[] = [
  { id: "e1", time: "09:00", service: "Barba", clientName: "João S.", status: "confirmed" },
  { id: "e2", time: "10:00", service: "Corte + Barba", clientName: "Pedro M.", status: "confirmed" },
  { id: "e3", time: "11:30", service: "Corte Masculino", clientName: "Lucas R.", status: "pending" },
];

const NEW_APPOINTMENT: SimAppointment = {
  id: "new1", time: "14:00", service: "Corte Masculino", clientName: "Visitante", status: "confirmed",
};

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const DEMO_CONFIG = {
  shopName: "Barbearia Demo", assistantName: "Luna", voiceTone: "friendly", niche: "barbearia",
  services: [
    { name: "Corte Masculino", price: 45, duration: 30 },
    { name: "Barba", price: 30, duration: 20 },
    { name: "Corte + Barba", price: 65, duration: 50 },
  ],
  businessHours: [
    { day: "segunda", open: "09:00", close: "19:00" },
    { day: "terça", open: "09:00", close: "19:00" },
    { day: "quarta", open: "09:00", close: "19:00" },
    { day: "quinta", open: "09:00", close: "19:00" },
    { day: "sexta", open: "09:00", close: "19:00" },
    { day: "sábado", open: "09:00", close: "17:00" },
  ],
  address: "Rua Exemplo, 123", neighborhood: "Centro", city: "São Paulo", state: "SP",
};

// ─── Phone Frame wrapper ───
const PhoneFrame = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative mx-auto ${className}`} style={{ maxWidth: 320 }}>
    {/* Phone bezel */}
    <div className="rounded-[2rem] border-[3px] border-foreground/10 bg-foreground/5 p-1.5 shadow-xl">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-foreground/10 rounded-b-xl z-10" />
      {/* Screen */}
      <div className="rounded-[1.4rem] overflow-hidden bg-background">
        {children}
      </div>
    </div>
  </div>
);

// ─── Typing Indicator ───
const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="bg-card rounded-2xl rounded-bl-sm shadow-sm px-3 py-2 border">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
        <Loader2 className="w-3 h-3 animate-spin" />
        digitando...
      </div>
    </div>
  </div>
);

// ─── Agenda Phone ───
const AgendaPhone = ({ appointments, showNew }: { appointments: SimAppointment[]; showNew: boolean }) => {
  const allApts = [...appointments, ...(showNew ? [NEW_APPOINTMENT] : [])];
  const aptByHour = new Map<number, SimAppointment>();
  allApts.forEach((a) => aptByHour.set(parseInt(a.time.split(":")[0]), a));

  return (
    <PhoneFrame>
      <div className="flex flex-col" style={{ height: 520 }}>
        {/* Status bar */}
        <div className="h-7 bg-background flex items-center justify-between px-5 pt-1">
          <span className="text-[9px] font-semibold text-muted-foreground">{nowTime()}</span>
          <div className="flex gap-1">
            <div className="w-3 h-1.5 rounded-sm bg-muted-foreground/30" />
            <div className="w-3 h-1.5 rounded-sm bg-muted-foreground/30" />
          </div>
        </div>

        {/* App header */}
        <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-foreground">Agenda</p>
            <p className="text-[9px] text-muted-foreground capitalize">
              {format(tomorrow, "EEE, dd MMM", { locale: ptBR })}
            </p>
          </div>
          <Badge variant="outline" className="text-[8px] ml-auto border-primary/30 text-primary px-1.5 py-0">
            Dia
          </Badge>
        </div>

        {/* Slots */}
        <div className="flex-1 overflow-y-auto">
          {HOURS.map((hour) => {
            const apt = aptByHour.get(hour);
            const isNew = apt?.id === "new1";
            return (
              <div key={hour} className="flex border-b border-border/20 min-h-[42px]">
                <div className="w-10 text-[9px] text-muted-foreground font-medium p-1 text-right border-r border-border/20 flex-shrink-0">
                  {String(hour).padStart(2, "0")}:00
                </div>
                <div className="flex-1 p-0.5">
                  {apt && (
                    <motion.div
                      initial={isNew ? { opacity: 0, scale: 0.8 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={isNew ? { duration: 0.5, type: "spring" } : undefined}
                      className={`mx-0.5 px-1.5 py-1 rounded-md text-[9px] font-medium ${
                        apt.status === "confirmed"
                          ? "bg-success/15 text-success border border-success/30"
                          : "bg-accent/15 text-accent border border-accent/30"
                      } ${isNew ? "ring-1 ring-primary/40" : ""}`}
                    >
                      <div className="flex items-center gap-1">
                        {apt.status === "confirmed" ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                        <span className="font-bold">{apt.time.slice(0, 5)}</span>
                        <span className="truncate">{apt.clientName}</span>
                      </div>
                      <p className="text-[8px] opacity-75 pl-3.5">{apt.service}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PhoneFrame>
  );
};

// ─── MAIN ───
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

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showTyping]);

  // Scripted conversation
  useEffect(() => {
    if (!started || scriptDone) return;
    if (scriptStep >= SCRIPT.length) {
      setScriptDone(true);
      setTimeout(() => setShowNewApt(true), 600);
      return;
    }
    const step = SCRIPT[scriptStep];
    const isBot = step.role === "assistant";

    if (isBot) {
      setShowTyping(true);
      const t = setTimeout(() => {
        setShowTyping(false);
        setMessages((p) => [...p, { id: `s${scriptStep}`, role: "assistant", content: step.content, time: nowTime() }]);
        setScriptStep((s) => s + 1);
      }, step.delay);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setMessages((p) => [...p, { id: `s${scriptStep}`, role: "user", content: step.content, time: nowTime() }]);
        setScriptStep((s) => s + 1);
      }, step.delay);
      return () => clearTimeout(t);
    }
  }, [started, scriptStep, scriptDone]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || aiLoading) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: text.trim(), time: nowTime() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setAiLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("chat-simulator", {
        body: { config: DEMO_CONFIG, messages: updated.map((m) => ({ role: m.role, content: m.content })), simulatedAppointments: [] },
      });
      if (error) throw error;
      setMessages((p) => [...p, { id: crypto.randomUUID(), role: "assistant", content: result.reply, time: nowTime() }]);
    } catch {
      setMessages((p) => [...p, { id: crypto.randomUUID(), role: "assistant", content: "Desculpe, houve um erro. Tente novamente!", time: nowTime() }]);
    } finally {
      setAiLoading(false);
      inputRef.current?.focus();
    }
  };

  const QUICK = [
    { label: "Preços", msg: "Quais serviços e preços?" },
    { label: "Horários", msg: "Qual o horário de funcionamento?" },
    { label: "Agendar barba", msg: "Quero agendar uma barba amanhã às 16h" },
  ];

  return (
    <section className="py-20 px-4 bg-secondary/50">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">Veja como funciona na prática</h2>
          <p className="text-muted-foreground text-lg">A IA atende e agenda — a agenda preenche automaticamente</p>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} transition={{ duration: 0.6, delay: 0.1 }}
          onAnimationComplete={() => setStarted(true)}
          className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-6 sm:gap-10"
        >
          {/* ─── WhatsApp Phone ─── */}
          <PhoneFrame>
            <div className="flex flex-col" style={{ height: 520 }}>
              {/* Status bar */}
              <div className="h-7 bg-primary flex items-center justify-between px-5 pt-1">
                <span className="text-[9px] font-semibold text-primary-foreground/70">{nowTime()}</span>
                <div className="flex gap-1">
                  <div className="w-3 h-1.5 rounded-sm bg-primary-foreground/30" />
                  <div className="w-3 h-1.5 rounded-sm bg-primary-foreground/30" />
                </div>
              </div>

              {/* WhatsApp header */}
              <div className="bg-primary px-3 py-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-primary-foreground font-bold text-[11px] truncate">Luna • Barbearia</p>
                  <div className="flex items-center gap-1">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-primary-foreground/70" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                    <p className="text-primary-foreground/60 text-[9px]">online</p>
                  </div>
                </div>
                <Badge className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 text-[8px] px-1.5 py-0">
                  <Zap className="w-2.5 h-2.5 mr-0.5" /> Demo
                </Badge>
              </div>

              {/* Messages */}
              <div className="flex-1 p-2.5 space-y-2 overflow-y-auto bg-secondary/30">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25, type: "spring", stiffness: 200 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card text-card-foreground rounded-bl-sm shadow-sm border"
                      }`}>
                        {msg.role === "assistant" && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <Bot className="w-2.5 h-2.5 text-primary" />
                            <span className="text-[9px] font-semibold text-primary">Luna</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[8px] mt-0.5 text-right ${msg.role === "user" ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                          {msg.time}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {(showTyping || aiLoading) && <TypingIndicator />}
                <div ref={scrollRef} />
              </div>

              {/* Input area */}
              {scriptDone && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-border/50 p-2 space-y-1.5 bg-card/80">
                  <div className="flex flex-wrap gap-1">
                    {QUICK.map((q) => (
                      <button key={q.label} onClick={() => sendMessage(q.msg)} disabled={aiLoading}
                        className="text-[8px] px-2 py-0.5 rounded-full border bg-card hover:bg-secondary transition-colors disabled:opacity-50">
                        {q.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Input ref={inputRef} placeholder="Mensagem..." value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                      disabled={aiLoading} className="h-7 text-[11px] flex-1" />
                    <Button onClick={() => sendMessage(input)} disabled={!input.trim() || aiLoading}
                      size="icon" className="h-7 w-7 shrink-0">
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </PhoneFrame>

          {/* ─── Agenda Phone ─── */}
          <AgendaPhone appointments={EXISTING_APPOINTMENTS} showNew={showNewApt} />
        </motion.div>
      </div>
    </section>
  );
};

export default WhatsAppMockup;
