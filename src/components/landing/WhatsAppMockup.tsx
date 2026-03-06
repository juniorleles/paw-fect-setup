import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, Loader2, Zap, CalendarDays, Clock, CheckCircle2, MessageSquare, Scissors, DollarSign, CalendarCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import whatsappBg from "@/assets/whatsapp-bg.png";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
const MAX_USER_MESSAGES = 5;
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const tomorrow = addDays(new Date(), 1);

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

interface SimAppointment {
  time: string;
  service: string;
  clientName: string;
}

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const DEMO_CONFIG = {
  shopName: "Barbearia Demo",
  assistantName: "Luna",
  voiceTone: "friendly",
  niche: "barbearia",
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
  address: "Rua Exemplo, 123",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
};

const SCENARIOS = [
  { label: "Agendar corte", icon: Scissors, msg: "Quero marcar um corte masculino para amanhã às 14h" },
  { label: "Ver preços", icon: DollarSign, msg: "Quais serviços vocês oferecem e quanto custa cada um?" },
  { label: "Horários livres", icon: CalendarCheck, msg: "Quais horários disponíveis para amanhã?" },
  { label: "Cancelar horário", icon: Clock, msg: "Preciso cancelar meu agendamento" },
];

const WhatsAppMockup = ({ embedded = false }: { embedded?: boolean }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<SimAppointment[]>([]);
  const [simulatedApts, setSimulatedApts] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const userMessageCount = messages.filter(m => m.role === "user").length;
  const limitReached = userMessageCount >= MAX_USER_MESSAGES;

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || limitReached) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: text.trim(), time: nowTime() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const { data: result, error } = await supabase.functions.invoke("chat-simulator", {
        body: {
          config: DEMO_CONFIG,
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          simulatedAppointments: simulatedApts,
        },
      });
      if (error) throw error;

      setMessages((p) => [
        ...p,
        { id: crypto.randomUUID(), role: "assistant", content: result.reply, time: nowTime() },
      ]);

      // Track appointments
      if (result.action?.type === "create") {
        const a = result.action;
        setAppointments((p) => [...p, { time: a.time, service: a.service, clientName: a.client_name || "Visitante" }]);
        setSimulatedApts((p) => [...p, `${a.date} ${a.time} - ${a.service} (${a.client_name}, status: confirmado)`]);
      } else if (result.action?.type === "cancel") {
        setSimulatedApts((p) => p.filter((apt) => !apt.includes(result.action.date) || !apt.includes(result.action.time)));
      }
    } catch {
      setMessages((p) => [
        ...p,
        { id: crypto.randomUUID(), role: "assistant", content: "Desculpe, houve um erro. Tente novamente!", time: nowTime() },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const hasMessages = messages.length > 0;

  const mockupContent = (
    <motion.div
      initial="hidden" whileInView="visible" viewport={{ once: true }}
      variants={fadeUp} transition={{ duration: 0.6, delay: 0.1 }}
      className="rounded-2xl border border-border/60 shadow-lg overflow-hidden bg-background"
    >
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-primary-foreground font-bold text-sm">Luna • Barbearia Demo</p>
              <div className="flex items-center gap-1.5">
                <motion.div
                  className="w-2 h-2 rounded-full bg-primary-foreground/70"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <p className="text-primary-foreground/60 text-xs">online</p>
              </div>
            </div>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 text-[10px]">
              <Zap className="w-3 h-3 mr-1" /> Simulação
            </Badge>
          </div>

          {/* Chat area */}
          <div className="p-4 space-y-3 overflow-y-auto" style={{ minHeight: 300, maxHeight: 420, backgroundImage: `url(${whatsappBg})`, backgroundSize: '300px', backgroundRepeat: 'repeat' }}>
            {/* Empty state with scenario buttons */}
            {!hasMessages && !loading && (
              <div className="flex flex-col items-center justify-center py-8 space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-7 h-7 text-primary/60" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground mb-1">Teste um cenário ou escreva sua mensagem</p>
                  <p className="text-xs text-muted-foreground">Nenhuma mensagem real será enviada</p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                  {SCENARIOS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.msg)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/60 bg-card hover:bg-secondary hover:border-primary/30 transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors flex-shrink-0">
                        <s.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-foreground">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, type: "spring", stiffness: 200 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card text-card-foreground rounded-bl-sm shadow-sm border"
                  }`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Bot className="w-3 h-3 text-primary" />
                        <span className="text-xs font-semibold text-primary">Luna</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-primary/30 text-primary">IA</Badge>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-1 text-right ${msg.role === "user" ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                      {msg.time}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-card border rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Luna está digitando...
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={scrollRef} />
          </div>

          {/* Appointment toast */}
          <AnimatePresence>
            {appointments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-border/50"
              >
                <div className="px-4 py-2.5 bg-success/5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-4 h-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Agendamento confirmado
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {appointments[appointments.length - 1].service} • {format(tomorrow, "dd/MM")} às {appointments[appointments.length - 1].time} • {appointments[appointments.length - 1].clientName}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick scenarios (after first message) + Input */}
          <div className="border-t border-border/50 p-3 space-y-2 bg-card/50">
            {limitReached ? (
              <div className="text-center py-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Você usou suas <span className="font-bold text-foreground">{MAX_USER_MESSAGES} mensagens</span> de teste 🎉
                </p>
                <a
                  href="/auth"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Crie sua conta grátis para continuar
                </a>
              </div>
            ) : (
              <>
                {hasMessages && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Teste:
                    </span>
                    {SCENARIOS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => sendMessage(s.msg)}
                        disabled={loading}
                        className="text-[10px] px-2.5 py-1 rounded-full border bg-card hover:bg-secondary transition-colors disabled:opacity-50"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Digite uma mensagem..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                    disabled={loading}
                    className="h-10 flex-1 text-sm"
                  />
                  <Button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    size="icon"
                    className="h-10 w-10 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhatsAppMockup;
