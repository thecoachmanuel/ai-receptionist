import type { BackendTerminology } from "@/lib/db/types";

export type BusinessPresetId =
  | "barber"
  | "salon"
  | "clinic"
  | "dental"
  | "spa"
  | "consulting"
  | "fitness"
  | "support"
  | "photography"
  | "general";

export interface SampleOffering {
  name: string;
  category: string;
  description: string;
  durationMinutes: number;
  priceMinor: number; // In minor units (e.g. 500000 = ₦5,000)
}

export interface BusinessPreset {
  id: BusinessPresetId;
  label: string;
  badge: string;
  description: string;
  terminology: BackendTerminology;
  headlineTemplate: (businessName: string) => string;
  subheadlineTemplate: (businessName: string) => string;
  aboutTemplate: (businessName: string) => string;
  welcomeMessageTemplate: (businessName: string) => string;
  sampleOfferings: SampleOffering[];
}

export const BUSINESS_PRESETS: Record<BusinessPresetId, BusinessPreset> = {
  barber: {
    id: "barber",
    label: "Barbershop",
    badge: "Grooming",
    description: "Services, barbers, & appointments",
    terminology: {
      offeringSingular: "Service",
      offeringPlural: "Services",
      teamMemberSingular: "Barber",
      teamMemberPlural: "Barbers",
      customerSingular: "Client",
      customerPlural: "Clients",
      bookingSingular: "Appointment",
      bookingPlural: "Appointments",
    },
    headlineTemplate: (name) => `Precision grooming and cuts at ${name}.`,
    subheadlineTemplate: () =>
      "Book your haircut, beard trim, or styling with our master barbers.",
    aboutTemplate: () =>
      "Masterful grooming, sharp fades, and classic cuts delivered in a modern, welcoming atmosphere.",
    welcomeMessageTemplate: (name) =>
      `Hi, I'm the AI receptionist for ${name}. Looking to book a haircut or grooming session?`,
    sampleOfferings: [
      {
        name: "Classic Haircut",
        category: "Haircuts",
        description: "Precision scissor and clipper cut, finished with a razor line-up and styling.",
        durationMinutes: 30,
        priceMinor: 500000,
      },
      {
        name: "Haircut & Beard Sculpting",
        category: "Combos",
        description: "Complete haircut with hot towel beard shaping, oil treatment, and razor finish.",
        durationMinutes: 45,
        priceMinor: 750000,
      },
      {
        name: "Hot Towel Shave & Facial",
        category: "Grooming",
        description: "Traditional hot towel straight razor shave with rejuvenating face massage.",
        durationMinutes: 30,
        priceMinor: 400000,
      },
    ],
  },
  salon: {
    id: "salon",
    label: "Hair Salon & Beauty",
    badge: "Salon & Beauty",
    description: "Treatments, stylists, & appointments",
    terminology: {
      offeringSingular: "Treatment",
      offeringPlural: "Treatments",
      teamMemberSingular: "Stylist",
      teamMemberPlural: "Stylists",
      customerSingular: "Client",
      customerPlural: "Clients",
      bookingSingular: "Appointment",
      bookingPlural: "Appointments",
    },
    headlineTemplate: (name) => `Elevate your style and beauty at ${name}.`,
    subheadlineTemplate: () =>
      "Experience personalized hair styling, treatments, and pampering.",
    aboutTemplate: () =>
      "Dedicated to bringing out your best look with personalized styling, premium treatments, and an exceptional guest experience.",
    welcomeMessageTemplate: (name) =>
      `Hello! Welcome to ${name}. Would you like to schedule an appointment with one of our stylists?`,
    sampleOfferings: [
      {
        name: "Wash, Cut & Blowout",
        category: "Hair Styling",
        description: "Invigorating shampoo, customized haircut, and professional blow-dry finish.",
        durationMinutes: 45,
        priceMinor: 1200000,
      },
      {
        name: "Balayage & Color Gloss",
        category: "Color",
        description: "Hand-painted dimensional color, tone refinement, and deep shine glaze.",
        durationMinutes: 90,
        priceMinor: 2500000,
      },
      {
        name: "Deep Conditioning Spa Treatment",
        category: "Hair Care",
        description: "Intensive moisture mask and scalp massage to restore vitality and softness.",
        durationMinutes: 30,
        priceMinor: 800000,
      },
    ],
  },
  clinic: {
    id: "clinic",
    label: "Medical & Health Clinic",
    badge: "Healthcare",
    description: "Treatments, practitioners, & patients",
    terminology: {
      offeringSingular: "Treatment",
      offeringPlural: "Treatments",
      teamMemberSingular: "Practitioner",
      teamMemberPlural: "Practitioners",
      customerSingular: "Patient",
      customerPlural: "Patients",
      bookingSingular: "Appointment",
      bookingPlural: "Appointments",
    },
    headlineTemplate: (name) => `Compassionate, expert medical care at ${name}.`,
    subheadlineTemplate: () =>
      "Schedule your consultation, check-up, or specialized treatment.",
    aboutTemplate: () =>
      "Providing patient-centered healthcare with dedicated medical professionals and modern clinical practices.",
    welcomeMessageTemplate: (name) =>
      `Hello, I'm the digital assistant for ${name}. How can I assist you with scheduling your appointment today?`,
    sampleOfferings: [
      {
        name: "General Medical Consultation",
        category: "Consultation",
        description: "Comprehensive health review and medical examination with our doctor.",
        durationMinutes: 30,
        priceMinor: 1500000,
      },
      {
        name: "Comprehensive Health Screening",
        category: "Wellness",
        description: "Full diagnostic panel, vital signs assessment, and lifestyle health review.",
        durationMinutes: 60,
        priceMinor: 3500000,
      },
      {
        name: "Follow-Up Consultation",
        category: "Follow-Up",
        description: "Progress review and prescription check following your previous visit.",
        durationMinutes: 20,
        priceMinor: 1000000,
      },
    ],
  },
  dental: {
    id: "dental",
    label: "Dental Practice",
    badge: "Dental",
    description: "Procedures, dentists, & patients",
    terminology: {
      offeringSingular: "Procedure",
      offeringPlural: "Procedures",
      teamMemberSingular: "Dentist",
      teamMemberPlural: "Dentists",
      customerSingular: "Patient",
      customerPlural: "Patients",
      bookingSingular: "Appointment",
      bookingPlural: "Appointments",
    },
    headlineTemplate: (name) => `Healthy, confident smiles at ${name}.`,
    subheadlineTemplate: () =>
      "Book dental exams, professional cleanings, and cosmetic smile care.",
    aboutTemplate: () =>
      "State-of-the-art dental care focused on gentle treatment, precision, and lifelong oral health.",
    welcomeMessageTemplate: (name) =>
      `Hello! I'm the dental assistant for ${name}. Would you like to schedule a dental check-up or cleaning?`,
    sampleOfferings: [
      {
        name: "Comprehensive Dental Exam",
        category: "Preventive",
        description: "Full oral examination, digital assessment, and preventative oral health plan.",
        durationMinutes: 30,
        priceMinor: 1500000,
      },
      {
        name: "Teeth Cleaning & Polishing",
        category: "Hygiene",
        description: "Professional ultrasonic scaling, plaque removal, and fluoride polish.",
        durationMinutes: 45,
        priceMinor: 2000000,
      },
      {
        name: "Cosmetic Smile Consultation",
        category: "Cosmetic",
        description: "Consultation on teeth whitening, alignment, and aesthetic smile enhancements.",
        durationMinutes: 30,
        priceMinor: 1200000,
      },
    ],
  },
  spa: {
    id: "spa",
    label: "Spa & Wellness",
    badge: "Wellness",
    description: "Therapies, therapists, & appointments",
    terminology: {
      offeringSingular: "Therapy",
      offeringPlural: "Therapies",
      teamMemberSingular: "Therapist",
      teamMemberPlural: "Therapists",
      customerSingular: "Client",
      customerPlural: "Clients",
      bookingSingular: "Appointment",
      bookingPlural: "Appointments",
    },
    headlineTemplate: (name) => `Rejuvenate your body and mind at ${name}.`,
    subheadlineTemplate: () =>
      "Book relaxing massages, facials, and holistic wellness therapies.",
    aboutTemplate: () =>
      "A tranquil sanctuary designed to restore balance, ease tension, and revitalize your senses.",
    welcomeMessageTemplate: (name) =>
      `Welcome to ${name}. Would you like to reserve a relaxing spa or wellness therapy?`,
    sampleOfferings: [
      {
        name: "Deep Tissue Massage",
        category: "Bodywork",
        description: "Targeted firm-pressure massage to relieve chronic muscular tension and stress.",
        durationMinutes: 60,
        priceMinor: 2000000,
      },
      {
        name: "Aromatherapy Relaxation Session",
        category: "Bodywork",
        description: "Gentle Swedish massage infused with essential oils to calm the nervous system.",
        durationMinutes: 60,
        priceMinor: 2500000,
      },
      {
        name: "Signature Glow Facial",
        category: "Skincare",
        description: "Exfoliating, hydrating, and sculpting facial treatment for luminous skin.",
        durationMinutes: 45,
        priceMinor: 1800000,
      },
    ],
  },
  consulting: {
    id: "consulting",
    label: "Consulting & Advisory",
    badge: "Advisory",
    description: "Services, consultants, & sessions",
    terminology: {
      offeringSingular: "Service",
      offeringPlural: "Services",
      teamMemberSingular: "Consultant",
      teamMemberPlural: "Consultants",
      customerSingular: "Client",
      customerPlural: "Clients",
      bookingSingular: "Session",
      bookingPlural: "Sessions",
    },
    headlineTemplate: (name) => `Strategic advisory and results with ${name}.`,
    subheadlineTemplate: () =>
      "Reserve time with our senior advisors to accelerate your business goals.",
    aboutTemplate: () =>
      "Delivering high-impact advisory, strategic clarity, and actionable guidance for ambitious leaders.",
    welcomeMessageTemplate: (name) =>
      `Hello! I'm the AI concierge for ${name}. Would you like to schedule an advisory consultation?`,
    sampleOfferings: [
      {
        name: "Initial Strategy Discovery Call",
        category: "Strategy",
        description: "Focused exploration of your objectives, current challenges, and high-impact next steps.",
        durationMinutes: 30,
        priceMinor: 2000000,
      },
      {
        name: "Comprehensive Advisory Session",
        category: "Advisory",
        description: "Deep-dive working session evaluating operational bottlenecks and growth roadmap.",
        durationMinutes: 60,
        priceMinor: 5000000,
      },
      {
        name: "Executive Review & Action Plan",
        category: "Executive",
        description: "Quarterly review and custom execution framework tailored for your leadership team.",
        durationMinutes: 90,
        priceMinor: 7500000,
      },
    ],
  },
  fitness: {
    id: "fitness",
    label: "Fitness & Training",
    badge: "Fitness",
    description: "Sessions, trainers, & members",
    terminology: {
      offeringSingular: "Session",
      offeringPlural: "Sessions",
      teamMemberSingular: "Trainer",
      teamMemberPlural: "Trainers",
      customerSingular: "Member",
      customerPlural: "Members",
      bookingSingular: "Session",
      bookingPlural: "Sessions",
    },
    headlineTemplate: (name) => `Reach your peak performance at ${name}.`,
    subheadlineTemplate: () =>
      "Book personal training, fitness assessments, and conditioning classes.",
    aboutTemplate: () =>
      "Empowering you to crush your fitness goals through science-backed coaching and personal attention.",
    welcomeMessageTemplate: (name) =>
      `Hey! Welcome to ${name}. Can I help you book a personal training session or fitness class?`,
    sampleOfferings: [
      {
        name: "1-on-1 Personal Training",
        category: "Training",
        description: "Customized workout focusing on strength, form, conditioning, and endurance.",
        durationMinutes: 60,
        priceMinor: 1000000,
      },
      {
        name: "Fitness & Body Assessment",
        category: "Assessment",
        description: "Body composition analysis, movement screening, and goal roadmap setting.",
        durationMinutes: 45,
        priceMinor: 1500000,
      },
      {
        name: "HIIT & Conditioning Circuit",
        category: "Conditioning",
        description: "High-intensity interval session designed to burn calories and boost stamina.",
        durationMinutes: 45,
        priceMinor: 800000,
      },
    ],
  },
  support: {
    id: "support",
    label: "Tech Support & IT",
    badge: "Tech & IT",
    description: "Support services, agents, & sessions",
    terminology: {
      offeringSingular: "Support service",
      offeringPlural: "Support services",
      teamMemberSingular: "Support agent",
      teamMemberPlural: "Support agents",
      customerSingular: "Customer",
      customerPlural: "Customers",
      bookingSingular: "Support session",
      bookingPlural: "Support sessions",
    },
    headlineTemplate: (name) => `Fast, dependable tech support from ${name}.`,
    subheadlineTemplate: () =>
      "Get your issues diagnosed and resolved by dedicated technical specialists.",
    aboutTemplate: () =>
      "Rapid, dependable IT diagnostics and resolution to keep your operations and hardware running smoothly.",
    welcomeMessageTemplate: (name) =>
      `Hi there! Welcome to ${name} support. How can I help resolve your technical issue today?`,
    sampleOfferings: [
      {
        name: "Remote Diagnostic & Fix",
        category: "Support",
        description: "Live remote diagnostic to troubleshoot system errors, software bugs, or crashes.",
        durationMinutes: 30,
        priceMinor: 1000000,
      },
      {
        name: "Complete Workstation Setup",
        category: "Setup",
        description: "Installation, software configuration, security hardening, and performance check.",
        durationMinutes: 60,
        priceMinor: 2500000,
      },
      {
        name: "Priority Troubleshooting Session",
        category: "Emergency",
        description: "Urgent turnaround for network, printer, and connectivity disruptions.",
        durationMinutes: 45,
        priceMinor: 1800000,
      },
    ],
  },
  photography: {
    id: "photography",
    label: "Photography Studio",
    badge: "Creative",
    description: "Sessions, photographers, & bookings",
    terminology: {
      offeringSingular: "Session",
      offeringPlural: "Sessions",
      teamMemberSingular: "Photographer",
      teamMemberPlural: "Photographers",
      customerSingular: "Client",
      customerPlural: "Clients",
      bookingSingular: "Booking",
      bookingPlural: "Bookings",
    },
    headlineTemplate: (name) => `Capture timeless moments with ${name}.`,
    subheadlineTemplate: () =>
      "Book studio portraits, lifestyle sessions, and event shoots.",
    aboutTemplate: () =>
      "Creating stunning visual stories with professional lighting, artistic direction, and attention to detail.",
    welcomeMessageTemplate: (name) =>
      `Hello! Welcome to ${name}. Looking to book a photo session or check our packages?`,
    sampleOfferings: [
      {
        name: "Studio Portrait Session",
        category: "Studio",
        description: "Professional studio session with 2 outfit changes and 5 retouched images.",
        durationMinutes: 45,
        priceMinor: 3000000,
      },
      {
        name: "Brand & Headshot Package",
        category: "Commercial",
        description: "Corporate and commercial headshots designed for press, LinkedIn, and websites.",
        durationMinutes: 60,
        priceMinor: 4500000,
      },
      {
        name: "Outdoor Creative Shoot",
        category: "On-Location",
        description: "Golden-hour natural lighting session at a scenic outdoor location.",
        durationMinutes: 30,
        priceMinor: 2500000,
      },
    ],
  },
  general: {
    id: "general",
    label: "General Service / Other",
    badge: "Universal",
    description: "Flexible setup for any service business",
    terminology: {
      offeringSingular: "Service",
      offeringPlural: "Services",
      teamMemberSingular: "Team member",
      teamMemberPlural: "Team",
      customerSingular: "Client",
      customerPlural: "Clients",
      bookingSingular: "Booking",
      bookingPlural: "Bookings",
    },
    headlineTemplate: (name) => `A simpler way to book with ${name}.`,
    subheadlineTemplate: () =>
      "Choose what you need, find a time that works, and confirm in moments.",
    aboutTemplate: () =>
      "Thoughtful service, straightforward scheduling, and a team ready to help.",
    welcomeMessageTemplate: (name) =>
      `Hi, I'm the ${name} assistant. How can I help you today?`,
    sampleOfferings: [
      {
        name: "Standard Consultation",
        category: "Consultation",
        description: "Direct discussion to evaluate requirements and provide tailored advice.",
        durationMinutes: 30,
        priceMinor: 1000000,
      },
      {
        name: "Comprehensive Service Session",
        category: "Services",
        description: "Full-length execution session delivering our complete core service.",
        durationMinutes: 60,
        priceMinor: 2000000,
      },
    ],
  },
};

export const BUSINESS_PRESET_LIST: BusinessPreset[] = [
  BUSINESS_PRESETS.barber,
  BUSINESS_PRESETS.salon,
  BUSINESS_PRESETS.clinic,
  BUSINESS_PRESETS.dental,
  BUSINESS_PRESETS.spa,
  BUSINESS_PRESETS.consulting,
  BUSINESS_PRESETS.fitness,
  BUSINESS_PRESETS.support,
  BUSINESS_PRESETS.photography,
  BUSINESS_PRESETS.general,
];

export function getBusinessPreset(idOrType?: string): BusinessPreset {
  if (!idOrType) return BUSINESS_PRESETS.general;

  const normalized = idOrType.trim().toLowerCase();

  if (normalized in BUSINESS_PRESETS) {
    return BUSINESS_PRESETS[normalized as BusinessPresetId];
  }

  // Aliases and partial match handling
  if (normalized.includes("barber") || normalized.includes("cut")) {
    return BUSINESS_PRESETS.barber;
  }
  if (normalized.includes("salon") || normalized.includes("hair") || normalized.includes("beauty") || normalized.includes("aesthetic")) {
    return BUSINESS_PRESETS.salon;
  }
  if (normalized.includes("dental") || normalized.includes("dentist") || normalized.includes("teeth")) {
    return BUSINESS_PRESETS.dental;
  }
  if (normalized.includes("clinic") || normalized.includes("medic") || normalized.includes("health") || normalized.includes("doctor")) {
    return BUSINESS_PRESETS.clinic;
  }
  if (normalized.includes("spa") || normalized.includes("wellness") || normalized.includes("massage") || normalized.includes("therapy")) {
    return BUSINESS_PRESETS.spa;
  }
  if (normalized.includes("consult") || normalized.includes("coach") || normalized.includes("advisory")) {
    return BUSINESS_PRESETS.consulting;
  }
  if (normalized.includes("fit") || normalized.includes("gym") || normalized.includes("train")) {
    return BUSINESS_PRESETS.fitness;
  }
  if (normalized.includes("support") || normalized.includes("tech") || normalized.includes("it") || normalized.includes("helpdesk")) {
    return BUSINESS_PRESETS.support;
  }
  if (normalized.includes("photo") || normalized.includes("studio") || normalized.includes("media") || normalized.includes("camera")) {
    return BUSINESS_PRESETS.photography;
  }

  return BUSINESS_PRESETS.general;
}
