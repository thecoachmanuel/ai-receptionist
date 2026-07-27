type Terminology = {
  offeringSingular: string;
  offeringPlural: string;
  teamMemberSingular: string;
  teamMemberPlural: string;
  customerSingular: string;
  customerPlural: string;
  bookingSingular: string;
  bookingPlural: string;
};

type OfferingContext = {
  name: string;
  description: string;
  durationMinutes: number;
  priceMinor: number;
};

type TeamMemberContext = {
  name: string;
  title: string;
  bio?: string;
  offeringIds?: string[];
};

type KnowledgeContext = {
  title: string;
  content: string;
};

function clamp(value: string, maximum = 8_000): string {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;
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

function currentLocalTime(timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());
}

/**
 * Builds the dynamic variables injected into each ElevenLabs agent session.
 * Every variable is scoped strictly to the requesting organization — the agent
 * has no knowledge of any other business's data.
 */
export function createAgentDynamicVariables({
  siteSlug,
  businessName,
  description,
  timezone,
  locale,
  currency,
  terminology,
  offerings,
  teamMembers,
  knowledgeItems,
  bookingInstruction,
}: {
  siteSlug: string;
  businessName: string;
  description: string;
  timezone: string;
  locale: string;
  currency: string;
  terminology: Terminology;
  offerings: OfferingContext[];
  teamMembers?: TeamMemberContext[];
  knowledgeItems: KnowledgeContext[];
  bookingInstruction?: string;
}) {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  });
  const localTime = currentLocalTime(timezone);

  // Build a human-readable team roster so the AI knows exactly who works here
  const teamRoster =
    teamMembers && teamMembers.length > 0
      ? clamp(
          teamMembers
            .map(
              (m) =>
                `${m.name} (${m.title || "Team member"})${m.bio ? ": " + m.bio : ""}`,
            )
            .join("\n"),
          3_000,
        )
      : "No team members are currently listed.";

  return {
    site_slug: siteSlug,
    business_name: businessName,
    business_description: clamp(description, 2_500),
    business_timezone: timezone,
    business_terminology: [
      `${terminology.offeringSingular}/${terminology.offeringPlural}`,
      `${terminology.teamMemberSingular}/${terminology.teamMemberPlural}`,
      `${terminology.customerSingular}/${terminology.customerPlural}`,
      `${terminology.bookingSingular}/${terminology.bookingPlural}`,
    ].join(", "),
    business_offerings: clamp(
      offerings
        .map((offering: any) => {
          const amount = offering.priceMinor / 100;
          const formattedPrice = currency.toUpperCase() === "NGN" 
            ? `${numberToWords(amount)} Naira` 
            : formatter.format(amount);
          return `${offering.name}: ${offering.description} (${offering.durationMinutes} minutes, ${formattedPrice})`;
        })
        .join("\n"),
    ),
    business_team: teamRoster,
    business_knowledge: clamp(
      knowledgeItems
        .map((item: any) => `${item.title}: ${item.content}`)
        .join("\n"),
    ),
    booking_instruction:
      bookingInstruction ??
      `Right now, it is ${localTime} in the ${timezone} timezone. You are a warm, professional, articulate, and wise AI receptionist for ${businessName}. Speak like a natural human female. When quoting the cost of a service, do NOT mention the duration of the service unless the customer specifically asks. Always pronounce NGN or Naira fully as "Naira", e.g. "Ten thousand Naira". Resolve an unqualified weekday such as Monday to its next future occurrence after this date. Use the booking tools to check live availability, create ${terminology.bookingPlural.toLowerCase()}, and securely look up, reschedule, or cancel existing ${terminology.bookingPlural.toLowerCase()}. Once the offering and date are known, call get_availability immediately before asking which time the customer prefers. Never redirect the customer to the booking panel when a tool can complete the request. If many times are available, offer at most five useful choices and ask whether the customer prefers another part of the day. Output only customer-facing speech: never narrate private reasoning, plans, or tool names.`,
    interaction_channel: "web",
    contact_number_policy:
      "This is a React web session, including text chat or browser audio. The first reply after detecting a booking, booking lookup, reschedule, cancellation, callback, or other contact-dependent request must ask for a contact phone number before giving directions or collecting other details. Confirm the number, then continue. General information does not require a phone number.",
  };
}
