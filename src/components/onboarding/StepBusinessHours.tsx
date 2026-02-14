import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { OnboardingData, DaySchedule } from "@/types/onboarding";
import { Clock, Copy } from "lucide-react";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
}

const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const StepBusinessHours = ({ data, onChange }: Props) => {
  const updateDay = (index: number, updates: Partial<DaySchedule>) => {
    const hours = [...data.businessHours];
    hours[index] = { ...hours[index], ...updates };
    onChange({ businessHours: hours });
  };

  const copyToAll = () => {
    const first = data.businessHours.find((d) => d.isOpen);
    if (!first) return;
    onChange({
      businessHours: data.businessHours.map((d) => ({
        ...d,
        openTime: first.openTime,
        closeTime: first.closeTime,
        isOpen: true,
      })),
    });
  };

  return (
    <Card className="border-none shadow-xl bg-card">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-3">
          <Clock className="w-8 h-8 text-accent" />
        </div>
        <CardTitle className="text-2xl font-display">Horário de Funcionamento</CardTitle>
        <CardDescription className="text-base">
          Configure os dias e horários de atendimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <Button variant="outline" size="sm" onClick={copyToAll} className="w-full mb-2">
          <Copy className="w-4 h-4 mr-2" />
          Copiar horário para todos os dias
        </Button>

        {data.businessHours.map((day, i) => (
          <div
            key={day.day}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              day.isOpen ? "bg-secondary" : "bg-muted/50"
            }`}
          >
            <Switch
              checked={day.isOpen}
              onCheckedChange={(checked) => updateDay(i, { isOpen: checked })}
            />
            <span className={`font-semibold text-sm min-w-[100px] ${!day.isOpen ? "text-muted-foreground" : ""}`}>
              {day.day}
            </span>
            {day.isOpen ? (
              <div className="flex items-center gap-2 ml-auto">
                <select
                  value={day.openTime}
                  onChange={(e) => updateDay(i, { openTime: e.target.value })}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="text-muted-foreground text-sm">às</span>
                <select
                  value={day.closeTime}
                  onChange={(e) => updateDay(i, { closeTime: e.target.value })}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            ) : (
              <span className="ml-auto text-sm text-muted-foreground italic">Fechado</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default StepBusinessHours;
