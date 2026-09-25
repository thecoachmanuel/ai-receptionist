import type { BackendTerminology, SiteConfig } from "@/lib/db/types";
import { getBusinessPreset, type BusinessPreset } from "@/lib/business-presets";

export const DEFAULT_TERMINOLOGY: BackendTerminology = {
  offeringSingular: "Service",
  offeringPlural: "Services",
  teamMemberSingular: "Team member",
  teamMemberPlural: "Team",
  customerSingular: "Client",
  customerPlural: "Clients",
  bookingSingular: "Booking",
  bookingPlural: "Bookings",
};

export function defaultSiteConfig(
  businessName: string,
  presetOrType?: BusinessPreset | string,
): SiteConfig {
  const preset =
    typeof presetOrType === "object" && presetOrType
      ? presetOrType
      : getBusinessPreset(presetOrType);

  return {
    businessName,
    headline: preset.headlineTemplate(businessName),
    subheadline: preset.subheadlineTemplate(businessName),
    about: preset.aboutTemplate(businessName),
    template: "editorial",
    theme: {
      accentColor: "#2446D8",
      backgroundColor: "#FAFAFA",
      foregroundColor: "#171717",
      mutedColor: "#64748B",
      radius: "soft",
      font: "editorial",
    },
    contact: {},
    socialLinks: [],
    sections: ["offerings", "team", "about", "faq", "contact", "booking"],
    booking: {
      enabled: true,
      slotIntervalMinutes: 30,
      minimumNoticeMinutes: 60,
      maximumAdvanceDays: 90,
      deposit: {
        enabled: false,
        percentage: 50,
        bankName: "",
        accountNumber: "",
        accountName: "",
        instructions: "",
      },
    },
    agent: {
      showWebChat: false,
      showVoiceChat: false,
      showVapiWidget: false,
      welcomeMessage: preset.welcomeMessageTemplate(businessName),
    },
  };
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "organization";
}
