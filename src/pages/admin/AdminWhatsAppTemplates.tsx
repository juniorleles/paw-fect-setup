import { useEffect, useState, useCallback } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import {
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Client {
  user_id: string;
  shop_name: string;
  meta_waba_id: string | null;
}

interface Template {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components?: any[];
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-green-500/15 text-green-400 border-green-500/30",
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  REJECTED: "bg-red-500/15 text-red-400 border-red-500/30",
  PAUSED: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const StatusIcon = ({ s }: { s: string }) => {
  if (s === "APPROVED") return <CheckCircle className="w-3.5 h-3.5" />;
  if (s === "PENDING") return <Clock className="w-3.5 h-3.5" />;
  return <AlertCircle className="w-3.5 h-3.5" />;
};

const AdminWhatsAppTemplates = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<Template | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<"UTILITY" | "MARKETING" | "AUTHENTICATION">(
    "UTILITY",
  );
  const [language, setLanguage] = useState("pt_BR");
  const [submitting, setSubmitting] = useState(false);

  // Load clients with WABA connected
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("pet_shop_configs")
        .select("user_id, shop_name, meta_waba_id")
        .not("meta_waba_id", "is", null)
        .order("shop_name");
      if (error) {
        toast.error("Erro ao carregar clientes");
        return;
      }
      setClients(data || []);
      if (data && data.length > 0) setSelectedUserId(data[0].user_id);
    })();
  }, []);

  const fetchTemplates = useCallback(async () => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-templates-manage",
        {
          method: "POST",
          body: { action: "list", userId: selectedUserId },
        },
      );
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Erro");
        setTemplates([]);
      } else {
        setTemplates(data.templates || []);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async () => {
    if (!name.trim() || !body.trim()) {
      toast.error("Nome e corpo são obrigatórios");
      return;
    }
    // Meta requires lowercase + underscores only
    const slug = name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-templates-manage",
        {
          method: "POST",
          body: {
            action: "create",
            userId: selectedUserId,
            name: slug,
            body,
            category,
            language,
          },
        },
      );
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Erro ao criar");
      } else {
        toast.success("Template enviado para aprovação da Meta");
        setCreateOpen(false);
        setName("");
        setBody("");
        fetchTemplates();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-templates-manage",
        {
          method: "POST",
          body: {
            action: "delete",
            userId: selectedUserId,
            templateName: deleting.name,
            hsmId: deleting.id,
          },
        },
      );
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Erro ao deletar");
      } else {
        toast.success("Template removido");
        setDeleting(null);
        fetchTemplates();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedClient = clients.find((c) => c.user_id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Templates WhatsApp
          </h1>
          <p className="text-sm text-[hsl(220,10%,55%)] mt-1">
            Gerencie templates de mensagens via Meta Cloud API por cliente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTemplates}
            disabled={loading || !selectedUserId}
            className="bg-transparent border-[hsl(220,15%,20%)] text-[hsl(220,10%,80%)] hover:bg-[hsl(220,15%,15%)]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={!selectedUserId}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Plus className="w-4 h-4" />
            Novo Template
          </Button>
        </div>
      </div>

      {/* Client selector */}
      <div className="bg-[hsl(220,20%,9%)] border border-[hsl(220,15%,15%)] rounded-lg p-4 space-y-3">
        <Label className="text-[hsl(220,10%,80%)]">Cliente (WABA conectada)</Label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="bg-[hsl(220,20%,12%)] border-[hsl(220,15%,20%)] text-[hsl(220,10%,90%)]">
            <SelectValue placeholder="Selecione um cliente..." />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,15%,20%)]">
            {clients.map((c) => (
              <SelectItem
                key={c.user_id}
                value={c.user_id}
                className="text-[hsl(220,10%,90%)] focus:bg-[hsl(220,15%,18%)]"
              >
                {c.shop_name} · WABA: {c.meta_waba_id?.slice(-8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {clients.length === 0 && (
          <p className="text-xs text-amber-400">
            Nenhum cliente com WABA Meta conectada ainda.
          </p>
        )}
      </div>

      {/* Search */}
      {selectedUserId && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(220,10%,55%)]" />
          <Input
            placeholder="Buscar template por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[hsl(220,20%,9%)] border-[hsl(220,15%,15%)] text-[hsl(220,10%,90%)]"
          />
        </div>
      )}

      {/* Templates list */}
      <div className="bg-[hsl(220,20%,9%)] border border-[hsl(220,15%,15%)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-[hsl(220,10%,55%)]">
            {selectedUserId
              ? "Nenhum template encontrado para este cliente."
              : "Selecione um cliente para ver os templates."}
          </div>
        ) : (
          <div className="divide-y divide-[hsl(220,15%,15%)]">
            {filtered.map((t) => {
              const bodyText =
                t.components?.find((c: any) => c.type === "BODY")?.text || "";
              return (
                <div
                  key={t.id}
                  className="p-4 hover:bg-[hsl(220,15%,11%)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-mono text-sm text-[hsl(220,10%,90%)] font-medium">
                          {t.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            STATUS_STYLES[t.status] || STATUS_STYLES.PAUSED
                          }`}
                        >
                          <StatusIcon s={t.status} />
                          {t.status}
                        </span>
                        <span className="text-[10px] text-[hsl(220,10%,55%)] uppercase">
                          {t.category} · {t.language}
                        </span>
                      </div>
                      {bodyText && (
                        <p className="text-sm text-[hsl(220,10%,70%)] whitespace-pre-wrap break-words">
                          {bodyText}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleting(t)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info card */}
      {selectedClient && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 text-xs text-[hsl(220,10%,70%)]">
          <p className="font-bold text-blue-400 mb-1">📋 Sobre Templates Meta</p>
          <p>
            Templates novos entram com status <strong>PENDING</strong> e
            normalmente são aprovados pela Meta em 1-15 minutos. Use categoria{" "}
            <strong>UTILITY</strong> para confirmações e lembretes,{" "}
            <strong>MARKETING</strong> para promoções.
          </p>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[hsl(220,20%,10%)] border-[hsl(220,15%,18%)] text-[hsl(220,10%,90%)]">
          <DialogHeader>
            <DialogTitle>Criar template via Graph API</DialogTitle>
            <DialogDescription className="text-[hsl(220,10%,55%)]">
              Será enviado para aprovação da Meta usando whatsapp_business_management.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome (a-z, números, _)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="lembrete_agendamento"
                className="bg-[hsl(220,20%,12%)] border-[hsl(220,15%,20%)] mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                  <SelectTrigger className="bg-[hsl(220,20%,12%)] border-[hsl(220,15%,20%)] mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,15%,20%)]">
                    <SelectItem value="UTILITY">UTILITY</SelectItem>
                    <SelectItem value="MARKETING">MARKETING</SelectItem>
                    <SelectItem value="AUTHENTICATION">AUTHENTICATION</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Idioma</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="bg-[hsl(220,20%,12%)] border-[hsl(220,15%,20%)] mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,15%,20%)]">
                    <SelectItem value="pt_BR">Português (BR)</SelectItem>
                    <SelectItem value="en_US">English (US)</SelectItem>
                    <SelectItem value="es_ES">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Corpo da mensagem</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Olá {{1}}, seu agendamento está confirmado para {{2}}."
                rows={5}
                className="bg-[hsl(220,20%,12%)] border-[hsl(220,15%,20%)] mt-1.5 font-mono text-sm"
              />
              <p className="text-[10px] text-[hsl(220,10%,55%)] mt-1">
                Use {`{{1}}`}, {`{{2}}`} para variáveis dinâmicas.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={submitting}
              className="bg-transparent border-[hsl(220,15%,20%)]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="bg-[hsl(220,20%,10%)] border-[hsl(220,15%,18%)] text-[hsl(220,10%,90%)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar template "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(220,10%,55%)]">
              Esta ação remove o template da conta WhatsApp Business do cliente. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={submitting}
              className="bg-transparent border-[hsl(220,15%,20%)]"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminWhatsAppTemplates;
