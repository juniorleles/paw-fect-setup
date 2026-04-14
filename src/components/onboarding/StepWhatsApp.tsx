import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "@/types/onboarding";
import { Phone, CheckCircle2, Loader2, MessageCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// DDDs válidos no Brasil
const VALID_DDDS = [
  "11","12","13","14","15","16","17","18","19",
  "21","22","24","27","28",
  "31","32","33","34","35","37","38",
  "41","42","43","44","45","46",
  "47","48","49",
  "51","53","54","55",
  "61","62","63","64","65","66","67","68","69",
  "71","73","74","75","77","79",
  "81","82","83","84","85","86","87","88","89",
  "91","92","93","94","95","96","97","98","99",
];

const validateBrazilianPhone = (digits: string): string | null => {
  if (digits.length !== 11) return "Informe um número válido com DDD (11 dígitos)";
  const ddd = digits.slice(0, 2);
  if (!VALID_DDDS.includes(ddd)) return `DDD "${ddd}" não é válido. Verifique o número.`;
  if (digits[2] !== "9") return "Número de celular deve começar com 9 após o DDD.";
  if (/^(\d)\1{10}$/.test(digits)) return "Número inválido. Não use dígitos repetidos.";
  // Bloquear números de teste conhecidos (555, 000, etc.)
  const localPart = digits.slice(2);
  if (localPart.startsWith("9555") || localPart.startsWith("9000")) {
    return "Este parece ser um número de teste. Use um número real.";
  }
  return null;
};

const StepWhatsApp = ({ data, onChange }: Props) => {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    onChange({ phone: formatted, phoneVerified: false });
    setError("");
  };

  const handleVerify = async () => {
    const digits = data.phone.replace(/\D/g, "");
    
    // Validação rigorosa de formato brasileiro
    const validationError = validateBrazilianPhone(digits);
    if (validationError) {
      setError(validationError);
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      let duplicateQuery = supabase
        .from("pet_shop_configs")
        .select("id, user_id")
        .in("phone", [digits, formatPhone(digits)]);

      if (user?.id) {
        duplicateQuery = duplicateQuery.neq("user_id", user.id);
      }

      const { data: existing, error: queryError } = await duplicateQuery.limit(1);

      if (queryError) throw queryError;

      if (existing && existing.length > 0) {
        setError("Este número já está cadastrado em outra conta. Use um número diferente.");
        setVerifying(false);
        return;
      }

      setVerifying(false);
      onChange({ phoneVerified: true });
    } catch (err) {
      console.error("Erro ao verificar telefone:", err);
      setError("Erro ao verificar o número. Tente novamente.");
      setVerifying(false);
    }
  };
  return (
    <Card className="border-none shadow-xl bg-card">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mb-3">
          <MessageCircle className="w-8 h-8 text-success" />
        </div>
        <CardTitle className="text-2xl font-display">Conectar WhatsApp</CardTitle>
        <CardDescription className="text-base">
          Informe o número que será usado pela secretária digital
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="font-semibold">Número do WhatsApp</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="phone"
              placeholder="(11) 99999-9999"
              value={data.phone}
              onChange={handlePhoneChange}
              className="pl-10 h-12 text-lg"
              disabled={data.phoneVerified}
            />
          </div>
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
        </div>

        {!data.phoneVerified ? (
          <Button
            onClick={handleVerify}
            disabled={verifying || data.phone.replace(/\D/g, "").length < 11}
            className="w-full h-12 text-base font-bold"
            size="lg"
          >
            {verifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verificando...
              </>
            ) : (
              "Verificar número"
            )}
          </Button>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-xl bg-success/10 border border-success/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
              <div>
                <p className="font-bold text-success">Número verificado!</p>
                <p className="text-sm text-muted-foreground">Seu WhatsApp está pronto para usar</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange({ phoneVerified: false })}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Alterar número
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StepWhatsApp;
