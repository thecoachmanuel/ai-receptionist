import type { SiteConfig } from "@/lib/db/types";
import { boundedInteger, optionalTrimmed, requiredTrimmed } from "./validation";

function safeOptionalUrl(value: unknown, label: string): string | undefined {
  const url = optionalTrimmed(value, label, 2_000);
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
  } catch {
    throw new Error(`${label} must be a valid http(s) URL.`);
  }
  return url;
}

function safeColor(value: unknown, label: string): string {
  const color = requiredTrimmed(value, label, 30);
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error(`${label} must be a six-digit hex color.`);
  }
  return color.toUpperCase();
}

export function sanitizeSiteConfig(config: SiteConfig): SiteConfig {
  if (!config) throw new Error("Site configuration is required.");
  const socialLinks = Array.isArray(config.socialLinks) ? config.socialLinks : [];
  const sections = Array.isArray(config.sections) ? config.sections : [];

  if (socialLinks.length > 12) throw new Error("At most 12 social links are allowed.");
  if (sections.length > 12) throw new Error("At most 12 page sections are allowed.");

  return {
    businessName: requiredTrimmed(config.businessName, "businessName", 120),
    headline: requiredTrimmed(config.headline, "headline", 180),
    subheadline: requiredTrimmed(config.subheadline, "subheadline", 400),
    about: requiredTrimmed(config.about, "about", 4_000),
    announcement: optionalTrimmed(config.announcement, "announcement", 240),
    logoUrl: safeOptionalUrl(config.logoUrl, "logoUrl"),
    heroImageUrl: safeOptionalUrl(config.heroImageUrl, "heroImageUrl"),
    template: config.template || "modern",
    theme: {
      accentColor: safeColor(config.theme?.accentColor, "theme.accentColor"),
      backgroundColor: safeColor(config.theme?.backgroundColor, "theme.backgroundColor"),
      foregroundColor: safeColor(config.theme?.foregroundColor, "theme.foregroundColor"),
      mutedColor: safeColor(config.theme?.mutedColor, "theme.mutedColor"),
      radius: config.theme?.radius ?? 8,
      font: config.theme?.font ?? "inter",
    },
    contact: {
      email: optionalTrimmed(config.contact?.email, "contact.email", 320),
      phone: optionalTrimmed(config.contact?.phone, "contact.phone", 40),
      address: optionalTrimmed(config.contact?.address, "contact.address", 500),
      mapUrl: safeOptionalUrl(config.contact?.mapUrl, "contact.mapUrl"),
    },
    socialLinks: socialLinks.map((link, index) => ({
      label: requiredTrimmed(link?.label, `socialLinks[${index}].label`, 40),
      url: safeOptionalUrl(link?.url, `socialLinks[${index}].url`) || "",
    })),
    sections: [...new Set(sections)],
    booking: {
      enabled: config.booking?.enabled ?? true,
      slotIntervalMinutes: boundedInteger(
        config.booking?.slotIntervalMinutes ?? 30,
        "booking.slotIntervalMinutes",
        5,
        240,
      ),
      minimumNoticeMinutes: boundedInteger(
        config.booking?.minimumNoticeMinutes ?? 60,
        "booking.minimumNoticeMinutes",
        0,
        43_200,
      ),
      maximumAdvanceDays: boundedInteger(
        config.booking?.maximumAdvanceDays ?? 60,
        "booking.maximumAdvanceDays",
        1,
        730,
      ),
    },
    agent: {
      showWebChat: config.agent?.showWebChat ?? true,
      showVoiceChat: config.agent?.showVoiceChat ?? true,
      showElevenLabsWidget: config.agent?.showElevenLabsWidget ?? false,
      welcomeMessage: requiredTrimmed(
        config.agent?.welcomeMessage,
        "agent.welcomeMessage",
        500,
      ),
    },
  };
}
