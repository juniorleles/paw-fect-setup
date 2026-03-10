import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  { label: "Planos e preços", msg: "Quais são os planos e preços da MagicZap?" },
  { label: "Como funciona?", msg: "Como funciona a MagicZap?" },
  { label: "Testar grátis", msg: "Posso testar a MagicZap gratuitamente?" },
  { label: "Falar com humano", msg: "Quero falar com um atendente humano" },
];

const SupportChatbot = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Falha na conexão");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch {
      upsertAssistant("Desculpe, ocorreu um erro. Tente novamente ou entre em contato pelo WhatsApp: (11) 98091-2272 😊");
    } finally {
      setIsLoading(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="rounded-2xl border border-border/60 shadow-xl overflow-hidden bg-background">
      {/* Header */}
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-primary-foreground font-bold text-sm">Mia • Suporte MagicZap</p>
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
          <Sparkles className="w-3 h-3 mr-1" /> IA
        </Badge>
      </div>

      {/* Chat area */}
      <div
        ref={chatRef}
        className="p-4 space-y-3 overflow-y-auto"
        style={{ minHeight: 320, maxHeight: 420 }}
      >
        {/* Empty state */}
        {!hasMessages && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-primary/60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground mb-1">Olá! Sou a Mia, assistente da MagicZap 👋</p>
              <p className="text-xs text-muted-foreground">Pergunte sobre planos, funcionalidades ou qualquer dúvida</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => sendMessage(q.msg)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/60 bg-card hover:bg-secondary hover:border-primary/30 transition-all text-left group"
                >
                  <span className="text-xs font-medium text-foreground">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, type: "spring", stiffness: 200 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card text-card-foreground rounded-bl-sm shadow-sm border"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Bot className="w-3 h-3 text-primary" />
                    <span className="text-xs font-semibold text-primary">Mia</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-primary/30 text-primary">IA</Badge>
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:mb-1.5 [&>ul]:mb-1.5 [&>ol]:mb-1.5">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-card border rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Mia está digitando...
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick questions after first message */}
      <div className="border-t border-border/50 p-3 space-y-2 bg-card/50">
        {hasMessages && (
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => sendMessage(q.msg)}
                disabled={isLoading}
                className="text-[10px] px-2.5 py-1 rounded-full border bg-card hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Digite sua dúvida..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            disabled={isLoading}
            className="h-10 flex-1 text-sm"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-10 w-10 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupportChatbot;
