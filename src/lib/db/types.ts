import type { ObjectId } from "mongodb";

export type PlanType = "free_org" | "engage" | "voice";

export type BackendTerminology = {
  offeringSingular: string;
  offeringPlural: string;
  teamMemberSingular: string;
  teamMemberPlural: string;
  customerSingular: string;
  customerPlural: string;
  bookingSingular: string;
  bookingPlural: string;
};

export type SiteConfig = {
  businessName: string;
  headline: string;
  subheadline: string;
  about: string;
  announcement?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  template: "editorial" | "gallery" | "compact";
  theme: {
    accentColor: string;
    backgroundColor: string;
    foregroundColor: string;
    mutedColor: string;
    radius: "sharp" | "soft" | "rounded";
    font: "modern" | "editorial" | "friendly";
  };
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    mapUrl?: string;
  };
  socialLinks: Array<{ label: string; url: string }>;
  sections: Array<"offerings" | "team" | "about" | "faq" | "contact" | "booking">;
  booking: {
    enabled: boolean;
    slotIntervalMinutes: number;
    minimumNoticeMinutes: number;
    maximumAdvanceDays: number;
  };
  agent: {
    showWebChat: boolean;
    showVoiceChat: boolean;
    showVapiWidget: boolean;
    welcomeMessage: string;
  };
};

export type DbUser = {
  _id?: ObjectId | string;
  email: string;
  passwordHash?: string;
  name: string;
  avatarUrl?: string;
  activeOrgId?: string;
  createdAt: number;
  updatedAt: number;
};

export type DbOrganization = {
  _id?: ObjectId | string;
  clerkOrgId: string;
  name: string;
  slug: string;
  createdBy?: string;
  timezone: string;
  currency: string;
  locale: string;
  terminology: BackendTerminology;
  plan: PlanType;
  planStatus: "active" | "trialing" | "canceled";
  trialEndsAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type DbOrgMember = {
  _id?: ObjectId | string;
  organizationId: string;
  userId: string;
  teamMemberId?: string;
  role: "admin" | "operator" | "member";
  createdAt: number;
  updatedAt: number;
};

export type DbLocation = {
  _id?: ObjectId | string;
  organizationId: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  active: boolean;
  isPrimary: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DbCalendarIntegration = {
  _id?: ObjectId | string;
  organizationId: string;
  teamMemberId: string;
  provider: "google";
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  calendarId: string;
  syncEnabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DbSession = {
  _id?: ObjectId | string;
  token: string;
  userId: string;
  activeOrgId?: string;
  expiresAt: number;
  createdAt: number;
};

export type DbPublicSite = {
  _id?: ObjectId | string;
  organizationId: string;
  siteSlug: string;
  draft: SiteConfig;
  published?: SiteConfig;
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type DbOffering = {
  _id?: ObjectId | string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceMinor: number;
  currency: string;
  capacity: number;
  locationIds?: string[];
  active: boolean;
  bookableOnline: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DbTeamMember = {
  _id?: ObjectId | string;
  organizationId: string;
  userId?: string;
  name: string;
  title: string;
  bio: string;
  email?: string;
  phone?: string;
  imageUrl?: string;
  offeringIds: string[];
  locationIds?: string[];
  active: boolean;
  acceptingBookings: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type DbAvailabilityRule = {
  _id?: ObjectId | string;
  organizationId: string;
  teamMemberId: string;
  timezone: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DbContact = {
  _id?: ObjectId | string;
  organizationId: string;
  name: string;
  email?: string;
  emailNormalized?: string;
  phone?: string;
  phoneNormalized?: string;
  notes?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "canceled"
  | "no_show";

export type DbBooking = {
  _id?: ObjectId | string;
  organizationId: string;
  publicSiteId?: string;
  contactId?: string;
  locationId?: string;
  offeringId: string;
  teamMemberId: string;
  startAt: number;
  endAt: number;
  reservedStartAt: number;
  reservedEndAt: number;
  status: BookingStatus;
  source: "dashboard" | "public_site" | "web_agent";
  notes?: string;
  confirmationCode: string;
  idempotencyKey?: string;
  idempotencyFingerprint?: string;
  locationSnapshot?: {
    name: string;
    address: string;
    city: string;
  };
  offeringSnapshot: {
    name: string;
    durationMinutes: number;
    priceMinor: number;
    currency: string;
  };
  teamMemberSnapshot: { name: string; title: string };
  customerSnapshot: {
    name: string;
    email?: string;
    phone?: string;
  };
  createdByUserId?: string;
  createdAt: number;
  updatedAt: number;
};

export type DbConversation = {
  _id?: ObjectId | string;
  organizationId: string;
  externalConversationId: string;
  channel: "web";
  status: "active" | "completed" | "failed";
  contactId?: string;
  bookingId?: string;
  caller?: string;
  transcript?: string;
  summary?: string;
  durationSeconds?: number;
  outcome?: string;
  startedAt: number;
  endedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type DbAgentIntegration = {
  _id?: ObjectId | string;
  organizationId: string;
  provider: "vapi";
  webAgentId?: string;
  webEnabled: boolean;
  knowledgeBaseId?: string;
  createdAt: number;
  updatedAt: number;
};

export type DbKnowledgeItem = {
  _id?: ObjectId | string;
  organizationId: string;
  title: string;
  content: string;
  category: string;
  published: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type DbRateLimit = {
  _id?: ObjectId | string;
  organizationId: string;
  publicSiteId?: string;
  scopeKey: string;
  windowStart: number;
  count: number;
  expiresAt: number;
};

export type DbContactMessage = {
  _id?: ObjectId | string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: "unread" | "read";
  createdAt: number;
  updatedAt: number;
};

export type DbWaitlistEntry = {
  _id?: ObjectId | string;
  name: string;
  email: string;
  createdAt: number;
};
