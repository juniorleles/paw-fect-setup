import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OnboardingData, NICHE_LABELS } from "@/types/onboarding";
import {
  Send,
  Trash2,
  Bot,
  Sparkles,
  MessageSquare,
  Loader2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  data: OnboardingData;
  acceptedTerms?: boolean;
  onAcceptedTermsChange?: (accepted: boolean) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SCENARIO_PROMPTS = [
  { label: "Agendar serviço", message: "Quero marcar um horário para amanhã às 14h" },
  { label: "Perguntar preços", message: "Quais serviços vocês oferecem e quanto custa?" },
  { label: "Horário de funcionamento", message: "Qual o horário de funcionamento?" },
  { label: "Cancelar agendamento", message: "Preciso cancelar meu horário" },
];

const StepSimulator = ({ data, acceptedTerms, onAcceptedTermsChange }: Props) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [simulatedAppointments, setSimulatedAppointments] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const { data: result, error } = await supabase.functions.invoke("chat-simulator", {
        body: {
          config: {
            shopName: data.shopName,
            assistantName: data.assistantName,
            voiceTone: data.voiceTone,
            services: data.services,
            businessHours: data.businessHours,
            address: data.address,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            niche: data.niche,
          },
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          simulatedAppointments,
        },
      });

      if (error) throw error;

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Track simulated appointments
      if (result.action?.type === "create") {
        const a = result.action;
        setSimulatedAppointments((prev) => [
          ...prev,
          `${a.date} ${a.time} - ${a.service} (${a.client_name}, status: confirmado)`,
        ]);
      } else if (result.action?.type === "cancel") {
        setSimulatedAppointments((prev) =>
          prev.filter((apt) => !apt.includes(result.action.date) || !apt.includes(result.action.time))
        );
      }
    } catch (err) {
      console.error("Simulator error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Desculpe, houve um erro na simulação. Tente novamente.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSimulatedAppointments([]);
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <Card className="border-none shadow-xl bg-card">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-3">
          <MessageSquare className="w-8 h-8 text-accent" />
        </div>
        <CardTitle className="text-2xl font-display">Teste sua Secretária IA</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Simule uma conversa e veja como ela atende seus clientes
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-secondary text-sm">
          <Badge variant="outline" className="border-primary/30 text-primary gap-1">
            <Bot className="w-3 h-3" /> {data.assistantName || "Secretária"}
          </Badge>
          <Badge variant="outline" className="border-muted-foreground/30 gap-1">
            {data.shopName}
          </Badge>
          <Badge variant="outline" className="border-muted-foreground/30 gap-1">
            {NICHE_LABELS[data.niche]}
          </Badge>
          <Badge className="bg-accent/15 text-accent border-accent/30 gap-1 ml-auto">
            <ShieldCheck className="w-3 h-3" /> Modo Simulação
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          Nenhuma mensagem real será enviada • Dados apenas em memória
        </p>

        {/* Chat area */}
        <div className="rounded-2xl border bg-muted/30 overflow-hidden" style={{ height: 380 }}>
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3 min-h-full flex flex-col justify-end">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-4">
                  <Sparkles className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-muted-foreground text-sm">
                    Envie uma mensagem ou teste um cenário pronto
                  </p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border shadow-sm rounded-bl-md"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Bot className="w-3 h-3 text-accent" />
                          <span className="text-xs font-semibold text-accent">
                            {data.assistantName}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-accent/30 text-accent">
                            IA
                          </Badge>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {data.assistantName} está digitando...
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Scenario buttons */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Zap className="w-3 h-3" /> Cenários:
          </span>
          {SCENARIO_PROMPTS.map((s) => (
            <button
              key={s.label}
              onClick={() => sendMessage(s.message)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full border bg-card hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Digite uma mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            disabled={loading}
            className="h-11 flex-1"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
          {messages.length > 0 && (
            <Button
              onClick={clearChat}
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              title="Limpar conversa"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Terms acceptance */}
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-secondary/50">
          <Checkbox
            id="accept-terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => onAcceptedTermsChange?.(checked === true)}
            className="mt-0.5"
          />
          <label htmlFor="accept-terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            Li e aceito os{" "}
            <Link to="/terms-of-service" target="_blank" className="text-primary underline hover:text-primary/80">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link to="/privacy-policy" target="_blank" className="text-primary underline hover:text-primary/80">
              Política de Privacidade
            </Link>
          </label>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepSimulator;
