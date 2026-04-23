import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Clock, AlertCircle, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface DeletionRequest {
  confirmation_code: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof Clock }> = {
  received: { label: "Recebida — em processamento", variant: "secondary", icon: Clock },
  in_progress: { label: "Em processamento", variant: "secondary", icon: Clock },
  completed: { label: "Concluída", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Recusada", variant: "destructive", icon: AlertCircle },
};

const DataDeletionStatus = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const [request, setRequest] = useState<DeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    document.title = "Status da Exclusão de Dados | MagicZap";

    const fetchStatus = async () => {
      if (!code) {
        setLoading(false);
        setNotFound(true);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("meta_data_deletion_requests" as never)
          .select("confirmation_code, status, requested_at, completed_at")
          .eq("confirmation_code", code)
          .maybeSingle();

        if (error || !data) {
          setNotFound(true);
        } else {
          setRequest(data as unknown as DeletionRequest);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [code]);

  const statusInfo = request ? statusMap[request.status] ?? statusMap.received : null;
  const StatusIcon = statusInfo?.icon ?? Clock;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Status da Exclusão de Dados</h1>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">Status da sua Solicitação</h2>
        <p className="text-muted-foreground mb-8">
          Acompanhe aqui o status da sua solicitação de exclusão de dados conforme
          a LGPD (Lei nº 13.709/2018) e as políticas da Meta.
        </p>

        {loading && (
          <Card className="p-8 text-center text-muted-foreground">Carregando...</Card>
        )}

        {!loading && notFound && (
          <Card className="p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Código não encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  {code
                    ? <>Não localizamos uma solicitação com o código <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{code}</code>.</>
                    : "Nenhum código de confirmação foi informado na URL."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Se você acredita que isso é um erro, entre em contato pelo e-mail{" "}
                  <a href="mailto:contato@magiczap.io" className="text-primary underline">
                    contato@magiczap.io
                  </a>{" "}
                  informando seu código.
                </p>
              </div>
            </div>
          </Card>
        )}

        {!loading && request && statusInfo && (
          <Card className="p-6 md:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <StatusIcon className="h-8 w-8 text-primary shrink-0 mt-1" />
              <div className="space-y-1">
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                <h3 className="text-lg font-semibold mt-2">
                  Código de confirmação
                </h3>
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">
                  {request.confirmation_code}
                </code>
              </div>
            </div>

            <div className="border-t border-border pt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Solicitada em:</span>
                <span className="font-medium">
                  {new Date(request.requested_at).toLocaleString("pt-BR")}
                </span>
              </div>
              {request.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Concluída em:</span>
                  <span className="font-medium">
                    {new Date(request.completed_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="font-semibold mb-2">O que acontece agora?</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Iniciamos a remoção dos seus dados associados ao app MagicZap.</li>
                <li>• A exclusão é processada em até <strong>30 dias corridos</strong> conforme a LGPD.</li>
                <li>• Dados retidos por obrigação legal (fiscal, contábil) ficam arquivados pelo prazo exigido por lei.</li>
                <li>• Você pode acompanhar o status nesta página a qualquer momento.</li>
              </ul>
            </div>

            <div className="border-t border-border pt-6 flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Dúvidas:</span>
              <a href="mailto:contato@magiczap.io" className="text-primary underline">
                contato@magiczap.io
              </a>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DataDeletionStatus;
