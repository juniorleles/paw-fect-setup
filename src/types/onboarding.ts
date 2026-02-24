export type BusinessNiche =
  | "clinica"
  | "salao"
  | "barbearia"
  | "estetica"
  | "escritorio"
  | "veterinaria"
  | "outros";

export const NICHE_LABELS: Record<BusinessNiche, string> = {
  clinica: "Clínica",
  salao: "Salão de Beleza",
  barbearia: "Barbearia",
  estetica: "Estética",
  escritorio: "Escritório / Consultório",
  veterinaria: "Veterinária",
  outros: "Outros Serviços",
};

export interface OnboardingData {
  // Step 1
  phone: string;
  phoneVerified: boolean;

  // Step 2
  niche: BusinessNiche;
  shopName: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;

  // Step 3
  businessHours: DaySchedule[];

  // Step 4
  services: Service[];

  // Step 5
  voiceTone: "formal" | "friendly" | "fun";
  assistantName: string;
}

export interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string;
  active?: boolean;
}

export const INITIAL_DATA: OnboardingData = {
  phone: "",
  phoneVerified: false,
  niche: "salao",
  shopName: "",
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  businessHours: [
    { day: "Segunda-feira", isOpen: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Terça-feira", isOpen: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Quarta-feira", isOpen: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Quinta-feira", isOpen: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Sexta-feira", isOpen: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Sábado", isOpen: true, openTime: "08:00", closeTime: "13:00" },
    { day: "Domingo", isOpen: false, openTime: "08:00", closeTime: "13:00" },
  ],
  services: [],
  voiceTone: "friendly",
  assistantName: "",
};

export const BRAZILIAN_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export const NICHE_SUGGESTIONS: Record<BusinessNiche, Omit<Service, "id">[]> = {
  clinica: [
    { name: "Consulta", price: 200, duration: 30, category: "Atendimento" },
    { name: "Retorno", price: 100, duration: 20, category: "Atendimento" },
    { name: "Exame de Rotina", price: 150, duration: 40, category: "Exames" },
    { name: "Procedimento Simples", price: 300, duration: 60, category: "Procedimentos" },
    { name: "Avaliação", price: 180, duration: 45, category: "Atendimento" },
  ],
  salao: [
    { name: "Corte Feminino", price: 80, duration: 60, category: "Corte" },
    { name: "Escova", price: 60, duration: 45, category: "Finalização" },
    { name: "Coloração", price: 150, duration: 120, category: "Química" },
    { name: "Manicure", price: 40, duration: 45, category: "Unhas" },
    { name: "Pedicure", price: 50, duration: 50, category: "Unhas" },
  ],
  barbearia: [
    { name: "Corte Masculino", price: 45, duration: 30, category: "Corte" },
    { name: "Barba", price: 35, duration: 20, category: "Barba" },
    { name: "Corte + Barba", price: 70, duration: 45, category: "Combo" },
    { name: "Sobrancelha", price: 20, duration: 10, category: "Acabamento" },
    { name: "Hidratação", price: 50, duration: 30, category: "Tratamento" },
  ],
  estetica: [
    { name: "Limpeza de Pele", price: 120, duration: 60, category: "Facial" },
    { name: "Peeling", price: 180, duration: 45, category: "Facial" },
    { name: "Drenagem Linfática", price: 150, duration: 60, category: "Corporal" },
    { name: "Massagem Relaxante", price: 130, duration: 60, category: "Corporal" },
    { name: "Design de Sobrancelha", price: 60, duration: 30, category: "Acabamento" },
  ],
  escritorio: [
    { name: "Consulta Inicial", price: 250, duration: 60, category: "Atendimento" },
    { name: "Reunião de Acompanhamento", price: 150, duration: 30, category: "Atendimento" },
    { name: "Avaliação", price: 200, duration: 45, category: "Análise" },
    { name: "Sessão", price: 180, duration: 50, category: "Atendimento" },
  ],
  veterinaria: [
    { name: "Consulta Veterinária", price: 150, duration: 30, category: "Consultas" },
    { name: "Vacinação", price: 90, duration: 20, category: "Prevenção" },
    { name: "Exame de Sangue", price: 120, duration: 15, category: "Exames" },
    { name: "Cirurgia Simples", price: 500, duration: 120, category: "Cirurgias" },
    { name: "Ultrassonografia", price: 200, duration: 30, category: "Exames" },
  ],
  outros: [
    { name: "Atendimento Padrão", price: 100, duration: 30, category: "Geral" },
    { name: "Serviço Completo", price: 200, duration: 60, category: "Geral" },
    { name: "Avaliação", price: 80, duration: 20, category: "Geral" },
  ],
};

// Keep backward compatibility
export const SUGGESTED_SERVICES = NICHE_SUGGESTIONS.salao;

export const STEP_LABELS = [
  "WhatsApp",
  "Dados",
  "Horários",
  "Serviços",
  "Personalizar",
  "Testar IA",
];
