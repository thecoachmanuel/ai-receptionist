"use client";

import { useMemo, useState } from "react";
import { callApi } from "@/lib/api-client/use-data";
import type {
  PublicOffering,
  PublicTeamMember,
} from "@/components/public-site/types";

function useConversationClientTool<T>(_name: keyof T & string, _fn: any) {
  // Client tools are registered dynamically via createAgentClientTools in widget embed
}

export type AgentToolActivity = {
  kind: "booked" | "found" | "rescheduled" | "canceled";
  status: string;
  offeringName: string;
  teamMemberName: string;
  localTime: string;
  confirmationCode: string;
};

type AgentClientTool = (
  parameters: Record<string, unknown>,
) => string | Promise<string>;

export type AgentClientTools = {
  get_business_info: AgentClientTool;
  get_availability: AgentClientTool;
  book_appointment: AgentClientTool;
  lookup_appointment: AgentClientTool;
  reschedule_appointment: AgentClientTool;
  cancel_appointment: AgentClientTool;
};

export type AgentToolName = keyof AgentClientTools;

export type AgentToolEvent = {
  id: string;
  name: AgentToolName;
  status: "running" | "succeeded" | "failed";
  inputSummary: string;
  resultSummary?: string;
  startedAt: number;
  finishedAt?: number;
};

type AgentSlotSelection = {
  offeringId: PublicOffering["_id"];
  offeringName: string;
  teamMemberId: PublicTeamMember["_id"];
  teamMemberName: string;
  startAt: number;
  startTimeISO: string;
};

type ToolFactoryOptions = {
  siteSlug: string;
  businessName: string;
  offerings: PublicOffering[];
  teamMembers: PublicTeamMember[];
  timezone: string;
  locale: string;
  onActivity?: (activity: AgentToolActivity) => void;
  onToolEvent?: (event: AgentToolEvent) => void;
  slotRegistry?: Map<string, AgentSlotSelection>;
};

function requiredText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizedName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(dr|doc|doctor|mr|mrs|ms)\b/gi, "")
    .replace(/[^a-z\d]+/gi, " ")
    .trim()
    .toLowerCase();
}

function resolveByName<T extends { name: string }>(
  items: T[],
  rawName: unknown,
  label: string,
) {
  if (!items || items.length === 0) {
    throw new Error(`No ${label.replaceAll("_", " ")}s registered.`);
  }
  if (!rawName || (typeof rawName === "string" && !rawName.trim())) {
    if (items.length === 1) return items[0];
    const choices = items.map((item: any) => item.name).join(", ");
    throw new Error(`${label} is required. Available choices: ${choices || "none"}.`);
  }
  const name = typeof rawName === "string" ? rawName.trim() : String(rawName).trim();
  const normalized = normalizedName(name);

  // 1. Exact match
  const exact = items.find((item: any) => normalizedName(item.name) === normalized);
  if (exact) return exact;

  // 2. Substring / inclusion match
  const partial = items.filter((item: any) => {
    const candidate = normalizedName(item.name);
    return candidate.includes(normalized) || normalized.includes(candidate);
  });
  if (partial.length === 1) return partial[0];

  // 3. Phonetic / word token overlap match for spoken mispronunciations
  const inputWords = normalized.split(/\s+/).filter(Boolean);
  const scored = items.map((item: any) => {
    const candWords = normalizedName(item.name).split(/\s+/).filter(Boolean);
    let overlap = 0;
    for (const w of inputWords) {
      if (candWords.some((cw) => cw.includes(w) || w.includes(cw))) {
        overlap++;
      }
    }
    return { item, overlap };
  }).filter((s) => s.overlap > 0);

  scored.sort((a, b) => b.overlap - a.overlap);
  if (scored.length > 0) {
    return scored[0].item;
  }

  if (items.length === 1) return items[0];

  const choices = items.map((item: any) => item.name).join(", ");
  throw new Error(`${label} was not found. Available choices: ${choices || "none"}.`);
}

function formatLocalTime(timestamp: number, locale: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: timezone,
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toISOString();
  }
}

function numberToWords(num: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

  if (num === 0) return 'zero';

  function convertGroup(n: number): string {
    let str = '';
    if (n > 99) {
      str += ones[Math.floor(n / 100)] + ' hundred ';
      n %= 100;
    }
    if (n > 9 && n < 20) {
      str += teens[n - 10] + ' ';
    } else {
      if (n > 19) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        str += ones[n] + ' ';
      }
    }
    return str.trim();
  }

  let words = '';
  if (num > 999999) {
    words += convertGroup(Math.floor(num / 1000000)) + ' million ';
    num %= 1000000;
  }
  if (num > 999) {
    words += convertGroup(Math.floor(num / 1000)) + ' thousand ';
    num %= 1000;
  }
  if (num > 0) {
    words += convertGroup(num) + ' ';
  }
  return words.trim();
}

function formatPrice(
  priceMinor: number,
  currency: string,
  locale: string,
) {
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    });
    const fractionDigits =
      formatter.resolvedOptions().maximumFractionDigits ?? 2;
    const amount = priceMinor / 10 ** fractionDigits;
    
    if (currency.toUpperCase() === "NGN") {
      return `${numberToWords(amount)} Naira`;
    }
    return formatter.format(amount);
  } catch {
    if (currency.toUpperCase() === "NGN") {
      return `${numberToWords(priceMinor / 100)} Naira`;
    }
    return `${currency} ${(priceMinor / 100).toFixed(2)}`;
  }
}

function stableIdempotencyKey(value: string) {
  let first = 2_166_136_261;
  let second = 2_654_435_761;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 16_777_619);
    second ^= code + index;
    second = Math.imul(second, 2_246_822_519);
  }
  return `web-agent-${(first >>> 0).toString(36)}-${(
    second >>> 0
  ).toString(36)}`;
}

const MAX_AGENT_SLOT_REFERENCES = 500;

function randomReference(prefix: "slot" | "tool") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
  }
  return `${prefix}_${stableIdempotencyKey(
    `${Date.now()}-${Math.random()}`,
  ).replace("web-agent-", "")}`;
}

function rememberAgentSlot(
  registry: Map<string, AgentSlotSelection>,
  selection: AgentSlotSelection,
) {
  while (registry.size >= MAX_AGENT_SLOT_REFERENCES) {
    const oldest = registry.keys().next().value as string | undefined;
    if (!oldest) break;
    registry.delete(oldest);
  }
  const slotId = randomReference("slot");
  registry.set(slotId, selection);
  return slotId;
}

function requireAgentSlot(
  registry: Map<string, AgentSlotSelection>,
  rawSlotId: unknown,
) {
  const slotId = requiredText(rawSlotId, "slot_id");
  const selection = registry.get(slotId);
  if (!selection) {
    throw new Error(
      "That slot reference is missing or stale. Check availability again and copy one exact slot_id.",
    );
  }
  return { slotId, selection };
}

function parseToolResult(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function recordText(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toolInputSummary(
  name: AgentToolName,
  parameters: Record<string, unknown>,
  slotRegistry: Map<string, AgentSlotSelection>,
  locale: string,
  timezone: string,
) {
  const slotId = optionalText(parameters.slot_id);
  const slot = slotId ? slotRegistry.get(slotId) : undefined;
  if (slot) {
    return `${slot.offeringName} · ${slot.teamMemberName} · ${formatLocalTime(
      slot.startAt,
      locale,
      timezone,
    )}`;
  }

  if (name === "get_business_info") return "Published business details";
  if (name === "lookup_appointment" || name === "cancel_appointment") {
    return "Existing booking request";
  }

  const parts = [
    optionalText(parameters.offering_name),
    optionalText(parameters.team_member_name),
    optionalText(parameters.date),
  ].filter((value): value is string => Boolean(value));
  return parts.join(" · ") || "Customer request";
}

function toolResultSummary(name: AgentToolName, value: string) {
  const result = parseToolResult(value);
  if (result?.success === false) {
    return {
      status: "failed" as const,
      summary: "The tool could not complete this request.",
    };
  }

  if (name === "get_business_info") {
    return { status: "succeeded" as const, summary: "Published details loaded" };
  }
  if (name === "get_availability") {
    const count = result?.available_time_count;
    return {
      status: "succeeded" as const,
      summary:
        typeof count === "number"
          ? `${count} available ${count === 1 ? "time" : "times"} found`
          : "Availability checked",
    };
  }

  const offering = recordText(result, "offering_name");
  const member = recordText(result, "team_member_name");
  const localTime = recordText(result, "local_time");
  const detail = [offering, member, localTime]
    .filter((entry): entry is string => Boolean(entry))
    .join(" · ");
  const action =
    name === "book_appointment"
      ? "Booking confirmed"
      : name === "lookup_appointment"
        ? "Booking found"
        : name === "reschedule_appointment"
          ? "Booking rescheduled"
          : "Booking canceled";
  return {
    status: "succeeded" as const,
    summary: detail ? `${action} · ${detail}` : action,
  };
}

function trackTool(
  name: AgentToolName,
  handler: AgentClientTool,
  onToolEvent: ToolFactoryOptions["onToolEvent"],
  slotRegistry: Map<string, AgentSlotSelection>,
  locale: string,
  timezone: string,
): AgentClientTool {
  if (!onToolEvent) return handler;

  return async (parameters: any) => {
    const id = randomReference("tool");
    const startedAt = Date.now();
    const inputSummary = toolInputSummary(
      name,
      parameters,
      slotRegistry,
      locale,
      timezone,
    );
    onToolEvent({ id, name, status: "running", inputSummary, startedAt });

    try {
      const result = await handler(parameters);
      const outcome = toolResultSummary(name, result);
      onToolEvent({
        id,
        name,
        status: outcome.status,
        inputSummary,
        resultSummary: outcome.summary,
        startedAt,
        finishedAt: Date.now(),
      });
      return result;
    } catch (error) {
      onToolEvent({
        id,
        name,
        status: "failed",
        inputSummary,
        resultSummary: "The tool could not complete this request.",
        startedAt,
        finishedAt: Date.now(),
      });
      throw error;
    }
  };
}

function toolError(error: unknown) {
  if (!(error instanceof Error)) {
    return JSON.stringify({
      success: false,
      error: "The request could not be completed. Ask the customer to try again.",
    });
  }
  const convexMessage = error.message.match(/Uncaught Error:\s*([^\n]+)/)?.[1];
  return JSON.stringify({
    success: false,
    error:
      convexMessage ||
      (error.message.length <= 300
        ? error.message
        : "The request could not be completed. Ask the customer to try again."),
  });
}

function activityFromBooking(
  kind: AgentToolActivity["kind"],
  booking: {
    status: string;
    startAt: number;
    confirmationCode: string;
    offering: { name: string };
    teamMember: { name: string };
  },
  locale: string,
  timezone: string,
): AgentToolActivity {
  return {
    kind,
    status: booking.status,
    offeringName: booking.offering.name,
    teamMemberName: booking.teamMember.name,
    localTime: formatLocalTime(booking.startAt, locale, timezone),
    confirmationCode: booking.confirmationCode,
  };
}

export function createAgentClientTools({
  siteSlug,
  businessName,
  offerings,
  teamMembers,
  timezone,
  locale,
  onActivity,
  onToolEvent,
  slotRegistry: suppliedSlotRegistry,
}: ToolFactoryOptions): AgentClientTools {
  const slotRegistry = suppliedSlotRegistry ?? new Map<string, AgentSlotSelection>();
  const resolveOffering = (name: unknown) =>
    resolveByName(offerings, name, "offering_name");
  const resolveTeamMember = (name: unknown) =>
    resolveByName(teamMembers, name, "team_member_name");

  const tools: AgentClientTools = {
    get_business_info: () =>
      JSON.stringify({
        success: true,
        business_name: businessName,
        timezone,
        offerings: offerings.map((offering: any) => ({
          name: offering.name,
          description: offering.description,
          duration_minutes: offering.durationMinutes,
          price: formatPrice(offering.priceMinor, offering.currency, locale),
        })),
        team_members: teamMembers.map((member: any) => ({
          name: member.name,
          title: member.title,
          offerings: offerings
            .filter((offering: any) =>
              member.offeringIds.some((id: any) => id === offering._id),
            )
            .map((offering: any) => offering.name),
        })),
      }),

    get_availability: async (parameters: any) => {
      try {
        const offering = resolveOffering(parameters.offering_name || parameters.service || parameters.offering || parameters.service_name);
        const rawDate = typeof parameters.date === "string" ? parameters.date.trim() : "";
        const dateMatch = rawDate.match(/\d{4}-\d{2}-\d{2}/);
        const date = dateMatch ? dateMatch[0] : (rawDate || new Date().toISOString().slice(0, 10));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          throw new Error("date must use YYYY-MM-DD in the business timezone.");
        }
        const memberName = optionalText(parameters.team_member_name || parameters.team_member || parameters.staff || parameters.member_name);
        const member = memberName ? resolveTeamMember(memberName) : undefined;
        const rawSlots = await callApi("publicBooking/getAvailableSlots", {
          siteSlug,
          offeringId: offering._id,
          dateStr: date,
          ...(member ? { teamMemberId: member._id } : {}),
        });
        const availability: any = {
          slots: rawSlots || [],
          timezone,
          offering: offering.name,
          date,
        };
        const groupedSlots = Array.from(
          availability.slots.reduce(
            (groups: any, slot: any) => {
              const current = groups.get(slot.startTimeISO) ?? {
                start_time_iso: slot.startTimeISO,
                end_time_iso: slot.endTimeISO,
                local_time: formatLocalTime(slot.startAt, locale, timezone),
                team_members: [] as AgentSlotSelection[],
              };
              current.team_members.push({
                offeringId: offering._id,
                offeringName: offering.name,
                teamMemberId: slot.teamMemberId,
                teamMemberName: slot.teamMemberName,
                startAt: slot.startAt,
                startTimeISO: slot.startTimeISO,
              });
              groups.set(slot.startTimeISO, current);
              return groups;
            },
            new Map<
              string,
              {
                start_time_iso: string;
                end_time_iso: string;
                local_time: string;
                team_members: AgentSlotSelection[];
              }
            >(),
          ).values(),
        );
        const publishedTimes = groupedSlots.slice(0, 12).map((slot: any) => ({
          start_time_iso: slot.start_time_iso,
          end_time_iso: slot.end_time_iso,
          local_time: slot.local_time,
          team_members: slot.team_members.map((selection: any) => ({
            slot_id: rememberAgentSlot(slotRegistry, selection),
            team_member_name: selection.teamMemberName,
            team_member_title: teamMembers.find(
              (candidate: any) => candidate._id === selection.teamMemberId,
            )?.title,
          })),
        }));
        return JSON.stringify({
          success: true,
          timezone: availability.timezone,
          offering: availability.offering,
          date: availability.date,
          available_time_count: groupedSlots.length,
          available_slot_count: availability.slots.length,
          response_instruction: groupedSlots.length === 0
            ? "No available slots were found for this date. State this politely to the customer out loud and ask if they would like to check another date."
            : `Found ${groupedSlots.length} available time slots. Speak up to 4 convenient times out loud naturally, and ask the customer which time works best for them or if they need a different time.`,
          selection_instruction:
            "Choose one team member at one time and copy that exact slot_id into the booking or reschedule tool.",
          times: publishedTimes,
          truncated: groupedSlots.length > 12,
        });
      } catch (error) {
        return toolError(error);
      }
    },

    book_appointment: async (parameters: any) => {
      try {
        const { slotId, selection } = requireAgentSlot(
          slotRegistry,
          parameters.slot_id || parameters.slot || parameters.id,
        );
        const offering = offerings.find(o => o._id === selection.offeringId) || resolveOffering(parameters.offering_name || parameters.service || parameters.offering);
        if (selection.offeringId !== offering._id) {
          throw new Error(
            "That slot_id belongs to a different offering. Check availability again.",
          );
        }
        const customerName = requiredText(
          parameters.customer_name || parameters.name || parameters.customer,
          "customer_name",
        );
        const phone = requiredText(
          parameters.phone || parameters.phone_number || parameters.contact_number || parameters.mobile,
          "phone",
        );
        const email = optionalText(parameters.email || parameters.email_address);
        const notes = optionalText(parameters.notes || parameters.note || parameters.reason);
        const booking = await callApi("publicBooking/create", {
          siteSlug,
          offeringId: offering._id,
          teamMemberId: selection.teamMemberId,
          startAt: selection.startAt,
          customer: {
            name: customerName,
            phone,
            ...(email ? { email } : {}),
          },
          ...(notes ? { notes } : {}),
          source: "ai_agent",
          idempotencyKey: stableIdempotencyKey(
            JSON.stringify({
              siteSlug,
              offeringId: offering._id,
              teamMemberId: selection.teamMemberId,
              startAt: selection.startAt,
              slotId,
              customerName: customerName.toLowerCase(),
              phone: phone.replace(/\D/g, ""),
              email: email?.toLowerCase() ?? null,
              notes: notes ?? null,
            }),
          ),
        });
        onActivity?.(
          activityFromBooking("booked", booking, locale, timezone),
        );
        const localFormattedTime = formatLocalTime(booking.startAt, locale, timezone);
        return JSON.stringify({
          success: true,
          action: booking.replayed ? "booking_replayed" : "booking_created",
          status: booking.status,
          confirmation_code: booking.confirmationCode,
          offering_name: booking.offering.name,
          team_member_name: booking.teamMember.name,
          customer_name: customerName,
          start_time_iso: booking.startTimeISO,
          local_time: localFormattedTime,
          response_instruction: `The appointment has been successfully booked! Speak out loud to the customer now: confirm that their appointment for ${booking.offering.name} with ${booking.teamMember.name} on ${localFormattedTime} is confirmed. Clearly state their confirmation code is ${booking.confirmationCode}. Ask if they need help with anything else.`,
        });
      } catch (error) {
        return toolError(error);
      }
    },

    lookup_appointment: async (parameters: any) => {
      try {
        const result = await callApi("publicBooking/lookup", {
          siteSlug,
          confirmationCode: requiredText(
            parameters.confirmation_code || parameters.code || parameters.booking_id || parameters.id,
            "confirmation_code",
          ),
          phone: requiredText(parameters.phone || parameters.phone_number || parameters.contact_number || parameters.mobile, "phone"),
        });
        if (!result.success) return JSON.stringify(result);
        const booking = result.booking;
        onActivity?.(activityFromBooking("found", booking, locale, timezone));
        return JSON.stringify({
          success: true,
          status: booking.status,
          confirmation_code: booking.confirmationCode,
          offering_name: booking.offering.name,
          team_member_name: booking.teamMember.name,
          start_time_iso: booking.startTimeISO,
          local_time: formatLocalTime(booking.startAt, locale, timezone),
        });
      } catch (error) {
        return toolError(error);
      }
    },

    reschedule_appointment: async (parameters: any) => {
      try {
        const { selection } = requireAgentSlot(
          slotRegistry,
          parameters.slot_id || parameters.slot || parameters.id,
        );
        const result = await callApi("publicBooking/reschedule", {
          siteSlug,
          confirmationCode: requiredText(
            parameters.confirmation_code || parameters.code || parameters.booking_id,
            "confirmation_code",
          ),
          phone: requiredText(parameters.phone || parameters.phone_number || parameters.contact_number || parameters.mobile, "phone"),
          offeringId: selection.offeringId,
          startAt: selection.startAt,
          teamMemberId: selection.teamMemberId,
        });
        if (!result.success) return JSON.stringify(result);
        const booking = result.booking;
        onActivity?.(
          activityFromBooking("rescheduled", booking, locale, timezone),
        );
        const localTimeFormatted = formatLocalTime(booking.startAt, locale, timezone);
        return JSON.stringify({
          success: true,
          action: "booking_rescheduled",
          status: booking.status,
          confirmation_code: booking.confirmationCode,
          offering_name: booking.offering.name,
          team_member_name: booking.teamMember.name,
          start_time_iso: booking.startTimeISO,
          local_time: localTimeFormatted,
          response_instruction: `The appointment has been successfully rescheduled! Speak out loud to the customer now: confirm that their appointment for ${booking.offering.name} is now rescheduled to ${localTimeFormatted} with ${booking.teamMember.name}. Confirmation code remains ${booking.confirmationCode}.`,
        });
      } catch (error) {
        return toolError(error);
      }
    },

    cancel_appointment: async (parameters: any) => {
      try {
        const result = await callApi("publicBooking/cancel", {
          siteSlug,
          confirmationCode: requiredText(
            parameters.confirmation_code || parameters.code || parameters.booking_id || parameters.id,
            "confirmation_code",
          ),
          phone: requiredText(parameters.phone || parameters.phone_number || parameters.contact_number || parameters.mobile, "phone"),
        });
        if (!result.success) return JSON.stringify(result);
        const booking = result.booking;
        onActivity?.(
          activityFromBooking("canceled", booking, locale, timezone),
        );
        const canceledTimeFormatted = formatLocalTime(booking.startAt, locale, timezone);
        return JSON.stringify({
          success: true,
          action: "booking_canceled",
          status: booking.status,
          confirmation_code: booking.confirmationCode,
          offering_name: booking.offering.name,
          team_member_name: booking.teamMember.name,
          start_time_iso: booking.startTimeISO,
          local_time: canceledTimeFormatted,
          response_instruction: `The appointment (Code: ${booking.confirmationCode}) has been successfully canceled! State this clearly out loud to the customer and ask if they would like to book a different time.`,
        });
      } catch (error) {
        return toolError(error);
      }
    },
  };

  return {
    get_business_info: trackTool(
      "get_business_info",
      tools.get_business_info,
      onToolEvent,
      slotRegistry,
      locale,
      timezone,
    ),
    get_availability: trackTool(
      "get_availability",
      tools.get_availability,
      onToolEvent,
      slotRegistry,
      locale,
      timezone,
    ),
    book_appointment: trackTool(
      "book_appointment",
      tools.book_appointment,
      onToolEvent,
      slotRegistry,
      locale,
      timezone,
    ),
    lookup_appointment: trackTool(
      "lookup_appointment",
      tools.lookup_appointment,
      onToolEvent,
      slotRegistry,
      locale,
      timezone,
    ),
    reschedule_appointment: trackTool(
      "reschedule_appointment",
      tools.reschedule_appointment,
      onToolEvent,
      slotRegistry,
      locale,
      timezone,
    ),
    cancel_appointment: trackTool(
      "cancel_appointment",
      tools.cancel_appointment,
      onToolEvent,
      slotRegistry,
      locale,
      timezone,
    ),
  };
}

export function AgentClientToolRegistrar(
  props: Omit<ToolFactoryOptions, "slotRegistry">,
) {
  const {
    siteSlug,
    businessName,
    offerings,
    teamMembers,
    timezone,
    locale,
    onActivity,
    onToolEvent,
  } = props;
  const [slotRegistry] = useState(
    () => new Map<string, AgentSlotSelection>(),
  );
  const tools = useMemo(
    () =>
      createAgentClientTools({
        siteSlug,
        businessName,
        offerings,
        teamMembers,
        timezone,
        locale,
        onActivity,
        onToolEvent,
        slotRegistry,
      }),
    [
      businessName,
      locale,
      offerings,
      onActivity,
      onToolEvent,
      siteSlug,
      slotRegistry,
      teamMembers,
      timezone,
    ],
  );

  useConversationClientTool<AgentClientTools>(
    "get_business_info",
    tools.get_business_info,
  );
  useConversationClientTool<AgentClientTools>(
    "get_availability",
    tools.get_availability,
  );
  useConversationClientTool<AgentClientTools>(
    "book_appointment",
    tools.book_appointment,
  );
  useConversationClientTool<AgentClientTools>(
    "lookup_appointment",
    tools.lookup_appointment,
  );
  useConversationClientTool<AgentClientTools>(
    "reschedule_appointment",
    tools.reschedule_appointment,
  );
  useConversationClientTool<AgentClientTools>(
    "cancel_appointment",
    tools.cancel_appointment,
  );

  return null;
}
