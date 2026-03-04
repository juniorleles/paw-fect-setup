export type BusinessNiche = "barbearia";

export const NICHE_LABELS: Record<BusinessNiche, string> = {
  barbearia: "Barbearia",
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
  maxConcurrentAppointments: number;

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
  price?: number;
  duration?: number;
  category?: string;
  active?: boolean;
}

export const INITIAL_DATA: OnboardingData = {
  phone: "",
  phoneVerified: false,
  niche: "petshop",
  shopName: "",
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  maxConcurrentAppointments: 1,
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
  petshop: [
    { name: "Banho", category: "Higiene" },
    { name: "Tosa", category: "Higiene" },
    { name: "Banho e Tosa", category: "Higiene" },
    { name: "Consulta Veterinária", category: "Saúde" },
    { name: "Vacinação", category: "Saúde" },
  ],
  clinica: [
    { name: "Consulta", category: "Atendimento" },
    { name: "Retorno", category: "Atendimento" },
    { name: "Exame de Rotina", category: "Exames" },
    { name: "Procedimento Simples", category: "Procedimentos" },
    { name: "Avaliação", category: "Atendimento" },
  ],
  salao: [
    { name: "Corte Feminino", category: "Corte" },
    { name: "Escova", category: "Finalização" },
    { name: "Coloração", category: "Química" },
    { name: "Manicure", category: "Unhas" },
    { name: "Pedicure", category: "Unhas" },
  ],
  barbearia: [
    { name: "Corte Masculino", category: "Corte" },
    { name: "Barba", category: "Barba" },
    { name: "Corte + Barba", category: "Combo" },
    { name: "Sobrancelha", category: "Acabamento" },
    { name: "Hidratação", category: "Tratamento" },
  ],
  estetica: [
    { name: "Limpeza de Pele", category: "Facial" },
    { name: "Peeling", category: "Facial" },
    { name: "Drenagem Linfática", category: "Corporal" },
    { name: "Massagem Relaxante", category: "Corporal" },
    { name: "Design de Sobrancelha", category: "Acabamento" },
  ],
  escritorio: [
    { name: "Consulta Inicial", category: "Atendimento" },
    { name: "Reunião de Acompanhamento", category: "Atendimento" },
    { name: "Avaliação", category: "Análise" },
    { name: "Sessão", category: "Atendimento" },
  ],
  veterinaria: [
    { name: "Consulta Veterinária", category: "Consultas" },
    { name: "Vacinação", category: "Prevenção" },
    { name: "Exame de Sangue", category: "Exames" },
    { name: "Cirurgia Simples", category: "Cirurgias" },
    { name: "Ultrassonografia", category: "Exames" },
  ],
  outros: [
    { name: "Atendimento Padrão", category: "Geral" },
    { name: "Serviço Completo", category: "Geral" },
    { name: "Avaliação", category: "Geral" },
  ],
};

// Keep backward compatibility
export const SUGGESTED_SERVICES = NICHE_SUGGESTIONS.petshop;

export const STEP_LABELS = [
  "WhatsApp",
  "Dados",
  "Horários",
  "Serviços",
  "Personalizar",
  "Testar IA",
];
