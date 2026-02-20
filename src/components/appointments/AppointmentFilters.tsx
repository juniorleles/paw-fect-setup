import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X, List, CalendarDays, Columns3, Filter } from "lucide-react";
import { format } from "date-fns";

export type ViewMode = "list" | "calendar" | "kanban";

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  serviceFilter: string;
  onServiceFilterChange: (service: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  quickDateFilter: string;
  onQuickDateFilterChange: (filter: string) => void;
  selectedDate: Date | undefined;
  onClearDate: () => void;
  uniqueServices: string[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const AppointmentFilters = ({
  viewMode,
  onViewModeChange,
  statusFilter,
  onStatusFilterChange,
  serviceFilter,
  onServiceFilterChange,
  searchQuery,
  onSearchQueryChange,
  quickDateFilter,
  onQuickDateFilterChange,
  selectedDate,
  onClearDate,
  uniqueServices,
  hasActiveFilters,
  onClearFilters,
}: Props) => {
  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4 space-y-3">
      {/* Top row: Quick date + search + view toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Quick date filters */}
        <div className="flex gap-1.5">
          {[
            { key: "all", label: "Todos" },
            { key: "today", label: "Hoje" },
            { key: "tomorrow", label: "Amanhã" },
            { key: "week", label: "Semana" },
          ].map((item) => (
            <Button
              key={item.key}
              variant={quickDateFilter === item.key ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs font-semibold"
              onClick={() => onQuickDateFilterChange(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
          {searchQuery && (
            <button onClick={() => onSearchQueryChange("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex border border-border rounded-lg overflow-hidden ml-auto">
          {([
            { key: "list" as const, icon: List, label: "Lista" },
            { key: "calendar" as const, icon: CalendarDays, label: "Calendário" },
            { key: "kanban" as const, icon: Columns3, label: "Kanban" },
          ]).map((item) => (
            <Button
              key={item.key}
              variant={viewMode === item.key ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8 gap-1.5 text-xs"
              onClick={() => onViewModeChange(item.key)}
            >
              <item.icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Bottom row: Status + service filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={serviceFilter} onValueChange={onServiceFilterChange}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Serviço" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os serviços</SelectItem>
            {uniqueServices.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedDate && (
          <Badge variant="secondary" className="h-8 px-3 flex items-center gap-1.5 text-xs">
            {format(selectedDate, "dd/MM/yyyy")}
            <button onClick={onClearDate}><X className="w-3 h-3" /></button>
          </Badge>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-8 text-xs text-muted-foreground ml-auto">
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
};

export default AppointmentFilters;
