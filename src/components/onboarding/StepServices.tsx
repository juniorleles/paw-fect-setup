import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OnboardingData, Service, SUGGESTED_SERVICES } from "@/types/onboarding";
import { Scissors, Plus, Trash2, Sparkles } from "lucide-react";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
  errors: Record<string, string>;
}

const StepServices = ({ data, onChange, errors }: Props) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

  const addService = () => {
    if (!name || !price || !duration) return;
    const service: Service = {
      id: crypto.randomUUID(),
      name,
      price: parseFloat(price),
      duration: parseInt(duration),
    };
    onChange({ services: [...data.services, service] });
    setName("");
    setPrice("");
    setDuration("");
  };

  const addSuggested = (s: Omit<Service, "id">) => {
    if (data.services.some((sv) => sv.name === s.name)) return;
    onChange({ services: [...data.services, { ...s, id: crypto.randomUUID() }] });
  };

  const removeService = (id: string) => {
    onChange({ services: data.services.filter((s) => s.id !== id) });
  };

  return (
    <Card className="border-none shadow-xl bg-card">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
          <Scissors className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-display">Serviços Oferecidos</CardTitle>
        <CardDescription className="text-base">
          Cadastre os serviços disponíveis no seu pet shop
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        {/* Suggestions */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-accent" /> Sugestões rápidas
          </Label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_SERVICES.map((s) => {
              const exists = data.services.some((sv) => sv.name === s.name);
              return (
                <Button
                  key={s.name}
                  variant={exists ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => addSuggested(s)}
                  disabled={exists}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {s.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Manual add */}
        <div className="space-y-3 p-4 rounded-xl bg-secondary/50">
          <Label className="font-semibold text-sm">Adicionar manualmente</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input placeholder="Nome do serviço" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Preço (R$)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            <Input placeholder="Duração (min)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <Button onClick={addService} disabled={!name || !price || !duration} size="sm" className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Adicionar serviço
          </Button>
        </div>

        {/* Service list */}
        {data.services.length > 0 && (
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Serviços cadastrados ({data.services.length})</Label>
            {data.services.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary">
                <div>
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {s.price.toFixed(2)} · {s.duration} min
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeService(s.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {errors.services && <p className="text-sm text-destructive font-medium">{errors.services}</p>}
      </CardContent>
    </Card>
  );
};

export default StepServices;
