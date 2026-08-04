export type PublicTerminology = {
  offeringSingular: string;
  offeringPlural: string;
  teamMemberSingular: string;
  teamMemberPlural: string;
  customerSingular: string;
  customerPlural: string;
  bookingSingular: string;
  bookingPlural: string;
};

export type PublicLocation = {
  _id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
};

export type PublicOffering = {
  _id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceMinor: number;
  currency: string;
  category?: string;
  locationIds?: string[];
  bookableOnline?: boolean;
  active?: boolean;
};

export type PublicTeamMember = {
  _id: string;
  name: string;
  title?: string;
  bio?: string;
  imageUrl?: string;
  offeringIds: string[];
  locationIds?: string[];
  active?: boolean;
  acceptingBookings?: boolean;
};

export type PublishedSite = {
  site: {
    _id: string;
    siteSlug: string;
    config?: any;
    businessName?: string;
    heroHeadline?: string;
    heroSubheadline?: string;
    about?: string;
    sections?: string[];
    layoutStyle?: string;
    primaryColor?: string;
    contact?: {
      phone?: string;
      email?: string;
      address?: string;
    };
    socialLinks?: Array<{ label: string; url: string }>;
    updatedAt?: number;
    publishedAt?: number;
  };
  organization: {
    clerkOrgId?: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    locale: string;
    terminology: any;
  };
  locations?: PublicLocation[];
  offerings: PublicOffering[];
  teamMembers: PublicTeamMember[];
  knowledgeItems: any[];
  agentEmbed?: {
    agentId: string;
    publicApiKey?: string;
  };
};

export type AvailabilitySlot = {
  startAt: number;
  startTimeISO: string;
  endTimeISO: string;
  teamMemberId: string;
  teamMemberName: string;
};

export type Availability = {
  timezone: string;
  dateStr: string;
  slots: AvailabilitySlot[];
};

export type BookingConfirmation = {
  _id: string;
  confirmationCode: string;
  status: string;
  startAt: number;
  startTimeISO: string;
  endTimeISO: string;
  offering: { name: string; priceMinor?: number; currency?: string };
  teamMember: { name: string };
  customer: { name: string; email?: string; phone?: string };
  replayed?: boolean;
};
