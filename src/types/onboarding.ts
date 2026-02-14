export interface OnboardingData {
  // Step 1
  phone: string;
  phoneVerified: boolean;

  // Step 2
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
}

export const INITIAL_DATA: OnboardingData = {
  phone: "",
  phoneVerified: false,
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

export const SUGGESTED_SERVICES: Omit<Service, "id">[] = [
  { name: "Banho", price: 60, duration: 60 },
  { name: "Tosa", price: 80, duration: 90 },
  { name: "Banho e Tosa", price: 120, duration: 120 },
  { name: "Consulta Veterinária", price: 150, duration: 30 },
  { name: "Vacinação", price: 90, duration: 20 },
];

export const STEP_LABELS = [
  "WhatsApp",
  "Dados",
  "Horários",
  "Serviços",
  "Personalizar",
];
