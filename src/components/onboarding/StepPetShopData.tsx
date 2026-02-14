import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OnboardingData, BRAZILIAN_STATES } from "@/types/onboarding";
import { Store } from "lucide-react";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
  errors: Record<string, string>;
}

const StepPetShopData = ({ data, onChange, errors }: Props) => {
  return (
    <Card className="border-none shadow-xl bg-card">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
          <Store className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-display">Dados do Pet Shop</CardTitle>
        <CardDescription className="text-base">
          Informações básicas do seu estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="shopName" className="font-semibold">Nome Fantasia *</Label>
          <Input
            id="shopName"
            placeholder="Ex: Pet House"
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
      </CardContent>
    </Card>
  );
};

export default StepPetShopData;
