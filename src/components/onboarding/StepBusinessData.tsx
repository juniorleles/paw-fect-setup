import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { OnboardingData, BRAZILIAN_STATES, NICHE_LABELS, BusinessNiche } from "@/types/onboarding";
import { Store, PawPrint, Stethoscope, Scissors, Sparkles, Building2, Briefcase, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
  errors: Record<string, string>;
  showEmail?: boolean;
}

const nicheKeys = Object.keys(NICHE_LABELS) as BusinessNiche[];

const NICHE_ICONS: Record<string, React.ElementType> = {
  petshop: PawPrint, clinica: Stethoscope, salao: Scissors,
  barbearia: Scissors, estetica: Sparkles, escritorio: Building2,
  veterinaria: Stethoscope, outros: Briefcase,
};

const StepBusinessData = ({ data, onChange, errors, showEmail = false }: Props) => {
  const { user } = useAuth();
  return (
    <Card className="border-none shadow-xl bg-card">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
          <Store className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-display">Dados do Estabelecimento</CardTitle>
        <CardDescription className="text-base">
          Informações básicas do seu negócio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Seleção de Nicho */}
        <div className="space-y-2">
          <Label className="font-semibold">Segmento *</Label>
          <div className="grid grid-cols-4 gap-2">
            {nicheKeys.map((key) => {
              const Icon = NICHE_ICONS[key] || Briefcase;
              const isSelected = data.niche === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange({ niche: key })}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 hover:border-primary/30 hover:bg-secondary/50"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    isSelected ? "bg-primary/15" : "bg-muted"
                  }`}>
                    <Icon className={`w-4.5 h-4.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`text-[11px] font-medium leading-tight text-center ${
                    isSelected ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {NICHE_LABELS[key]}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.niche && <p className="text-sm text-destructive">{errors.niche}</p>}
        </div>

        {showEmail && user?.email && (
          <div className="space-y-2">
            <Label className="font-semibold">Email</Label>
            <Input
              value={user.email}
              readOnly
              disabled
              className="h-11 bg-muted cursor-not-allowed"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="shopName" className="font-semibold">Nome Fantasia *</Label>
          <Input
            id="shopName"
            placeholder="Ex: Studio Maria, Clínica Saúde..."
            value={data.shopName}
            onChange={(e) => onChange({ shopName: e.target.value })}
            className="h-11"
          />
          {errors.shopName && <p className="text-sm text-destructive">{errors.shopName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="font-semibold">Endereço *</Label>
          <Input
            id="address"
            placeholder="Rua, número"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            className="h-11"
          />
          {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="neighborhood" className="font-semibold">Bairro *</Label>
          <Input
            id="neighborhood"
            placeholder="Bairro"
            value={data.neighborhood}
            onChange={(e) => onChange({ neighborhood: e.target.value })}
            className="h-11"
          />
          {errors.neighborhood && <p className="text-sm text-destructive">{errors.neighborhood}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="city" className="font-semibold">Cidade *</Label>
            <Input
              id="city"
              placeholder="Cidade"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
              className="h-11"
            />
            {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">UF *</Label>
            <Select value={data.state} onValueChange={(v) => onChange({ state: v })}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {BRAZILIAN_STATES.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
          </div>
        </div>

        {/* Formas de Pagamento */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <Label className="font-semibold">Formas de Pagamento Aceitas</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Selecione as formas de pagamento para que a IA informe seus clientes automaticamente
          </p>
          <div className="grid grid-cols-2 gap-2">
            {["Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Transferência Bancária", "Boleto"].map((method) => {
              const selected = data.paymentMethods?.includes(method) ?? false;
              return (
                <label
                  key={method}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => {
                      const current = data.paymentMethods ?? [];
                      const updated = checked
                        ? [...current, method]
                        : current.filter((m) => m !== method);
                      onChange({ paymentMethods: updated });
                    }}
                  />
                  <span className="text-sm">{method}</span>
                </label>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepBusinessData;
