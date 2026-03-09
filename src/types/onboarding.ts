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
  attendants: string[];

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
