export type BusinessNiche =
  | "barbearia"
  | "salao"
  | "estetica"
  | "clinica"
  | "petshop"
  | "veterinaria"
  | "escritorio"
  | "outros";

export const NICHE_LABELS: Record<BusinessNiche, string> = {
  barbearia: "Barbearia",
  salao: "Salão de Beleza",
  estetica: "Estética",
  clinica: "Clínica",
  petshop: "Pet Shop",
  veterinaria: "Veterinária",
  escritorio: "Escritório",
  outros: "Outros",
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
  attendants: string[];

  // Step 4
  services: Service[];

  // Step 5
  voiceTone: "formal" | "friendly" | "fun";
  assistantName: string;

  // Payment
  paymentMethods: string[];
}

export interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  /** Second shift start (afternoon). If set, creates a lunch break gap. */
  openTime2?: string;
  closeTime2?: string;
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
  niche: "barbearia",
  shopName: "",
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  maxConcurrentAppointments: 1,
  attendants: [""],
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
  paymentMethods: [],
};

export const BRAZILIAN_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export const NICHE_SUGGESTIONS: Record<BusinessNiche, Omit<Service, "id">[]> = {
  barbearia: [
    { name: "Corte Masculino", price: 50, duration: 30, category: "Corte" },
    { name: "Barba", price: 35, duration: 30, category: "Barba" },
    { name: "Corte + Barba", price: 75, duration: 60, category: "Combo" },
    { name: "Sobrancelha", price: 20, duration: 30, category: "Acabamento" },
    { name: "Hidratação", price: 40, duration: 30, category: "Tratamento" },
  ],
  salao: [
    { name: "Corte Feminino", price: 80, duration: 45, category: "Corte" },
    { name: "Escova", price: 60, duration: 45, category: "Escova" },
    { name: "Coloração", price: 150, duration: 90, category: "Coloração" },
    { name: "Manicure", price: 35, duration: 30, category: "Unhas" },
    { name: "Pedicure", price: 40, duration: 40, category: "Unhas" },
  ],
  estetica: [
    { name: "Limpeza de Pele", price: 120, duration: 60, category: "Facial" },
    { name: "Peeling", price: 150, duration: 45, category: "Facial" },
    { name: "Drenagem Linfática", price: 100, duration: 60, category: "Corporal" },
    { name: "Massagem Relaxante", price: 90, duration: 60, category: "Corporal" },
    { name: "Depilação", price: 50, duration: 30, category: "Depilação" },
  ],
  clinica: [
    { name: "Consulta", price: 200, duration: 30, category: "Consulta" },
    { name: "Retorno", price: 0, duration: 20, category: "Consulta" },
    { name: "Exame", price: 100, duration: 30, category: "Exame" },
  ],
  petshop: [
    { name: "Banho Pequeno", price: 50, duration: 60, category: "Banho" },
    { name: "Banho Grande", price: 80, duration: 90, category: "Banho" },
    { name: "Tosa Higiênica", price: 40, duration: 30, category: "Tosa" },
    { name: "Banho e Tosa", price: 90, duration: 90, category: "Combo" },
    { name: "Hidratação de Pelos", price: 30, duration: 15, category: "Tratamento" },
  ],
  veterinaria: [
    { name: "Consulta", price: 150, duration: 30, category: "Consulta" },
    { name: "Vacina", price: 80, duration: 15, category: "Vacina" },
    { name: "Exame de Sangue", price: 120, duration: 20, category: "Exame" },
    { name: "Retorno", price: 0, duration: 20, category: "Consulta" },
  ],
  escritorio: [
    { name: "Reunião", price: 0, duration: 60, category: "Reunião" },
    { name: "Consultoria", price: 200, duration: 60, category: "Consultoria" },
  ],
  outros: [
    { name: "Atendimento", price: 100, duration: 30, category: "Geral" },
    { name: "Consulta", price: 150, duration: 45, category: "Geral" },
  ],
};

// Keep backward compatibility
export const SUGGESTED_SERVICES = NICHE_SUGGESTIONS.barbearia;

export const STEP_LABELS = [
  "WhatsApp",
  "Dados",
  "Horários",
  "Serviços",
  "Personalizar",
  "Testar IA",
];
