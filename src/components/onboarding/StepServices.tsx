import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { OnboardingData, Service, NICHE_SUGGESTIONS } from "@/types/onboarding";
import { Briefcase, Plus, Trash2, Sparkles } from "lucide-react";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
  errors: Record<string, string>;
}

const StepServices = ({ data, onChange, errors }: Props) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [category, setCategory] = useState("");

  const suggestions = NICHE_SUGGESTIONS[data.niche] ?? NICHE_SUGGESTIONS.outros;

  const addService = () => {
    if (!name || !duration) return;
    const service: Service = {
      id: crypto.randomUUID(),
      name,
      price: price ? parseFloat(price) : undefined,
      duration: parseInt(duration),
      category: category || undefined,
      active: true,
    };
    onChange({ services: [...data.services, service] });
    setName("");
    setPrice("");
    setDuration("");
    setCategory("");
  };

  const addSuggested = (s: Omit<Service, "id">) => {
    if (data.services.some((sv) => sv.name === s.name)) return;
    onChange({ services: [...data.services, { ...s, id: crypto.randomUUID(), active: true }] });
  };

  const removeService = (id: string) => {
    onChange({ services: data.services.filter((s) => s.id !== id) });
  };

  const toggleActive = (id: string) => {
    onChange({
      services: data.services.map((s) =>
        s.id === id ? { ...s, active: s.active === false ? true : false } : s
      ),
    });
  };

  return (
    <Card className="border-none shadow-xl bg-card">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
          <Briefcase className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-display">Serviços Oferecidos</CardTitle>
        <CardDescription className="text-base">
          Cadastre os serviços disponíveis no seu estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        {/* Suggestions */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-accent" /> Sugestões rápidas
          </Label>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => {
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Nome do serviço" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Categoria (opcional)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <Input placeholder="Preço R$ (opcional)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            <Input placeholder="Duração (min)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <Button onClick={addService} disabled={!name || !duration} size="sm" className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Adicionar serviço
          </Button>
        </div>

        {/* Service list */}
        {data.services.length > 0 && (
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Serviços cadastrados ({data.services.length})</Label>
            {data.services.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between p-3 rounded-xl transition-opacity ${
                  s.active === false ? "bg-secondary/50 opacity-60" : "bg-secondary"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Switch
                    checked={s.active !== false}
                    onCheckedChange={() => toggleActive(s.id)}
                    className="flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.price != null ? `R$ ${Number(s.price).toFixed(2)}` : "Sem preço"}
                      {s.duration != null ? ` · ${s.duration} min` : ""}
                      {s.category ? ` · ${s.category}` : ""}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeService(s.id)} className="text-destructive hover:text-destructive flex-shrink-0">
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
