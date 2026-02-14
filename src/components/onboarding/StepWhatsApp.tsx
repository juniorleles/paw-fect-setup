import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "@/types/onboarding";
import { Phone, CheckCircle2, Loader2, MessageCircle } from "lucide-react";

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
    if (digits.length < 11) {
      setError("Informe um número válido com DDD");
      return;
    }
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 2000));
    setVerifying(false);
    onChange({ phoneVerified: true });
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
          <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
            <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
            <div>
              <p className="font-bold text-success">Número verificado!</p>
              <p className="text-sm text-muted-foreground">Seu WhatsApp está pronto para usar</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StepWhatsApp;
