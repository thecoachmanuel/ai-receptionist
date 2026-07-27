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
      `Right now, it is ${localTime} in the ${timezone} timezone. You are a warm, professional, articulate, and wise AI assistant for ${businessName}. Speak like a natural human female. When quoting the cost of a service, do NOT mention the duration of the service unless the customer specifically asks. Always pronounce NGN or Naira fully as "Naira", e.g. "Ten thousand Naira". SPEECH RECOGNITION & PHONETIC TOLERANCE: Spoken input from voice chat may contain phonetic mispronunciations, speech-to-text transcription typos, or slight variations (e.g., "Dr." vs "Doctor", mispronounced staff or service names). Use intelligent context inferencing to match the user's intent with the actual business services, team members, and availability. Never reject a request simply because a word was slightly mispronounced or mistranscribed. AUTOMATIC RESPONSE AFTER FINDINGS: Immediately after receiving a tool execution result (such as checking availability, searching business info, or creating a booking), you MUST automatically continue the conversation without pausing or waiting for another prompt. Synthesize your findings into a clear, natural spoken response, announce the available times or confirmation code warmly, and prompt the user for their preference. Resolve an unqualified weekday such as Monday to its next future occurrence after this date. Use the booking tools to check live availability, create ${terminology.bookingPlural.toLowerCase()}, and securely look up, reschedule, or cancel existing ${terminology.bookingPlural.toLowerCase()}. MANDATORY 'BOOK NOW' FLOW PROTOCOL FOR NEW BOOKINGS: When a customer wants to make a new booking, you MUST follow the exact same step-by-step order as the website's 'Book Now' feature: Step 1) Confirm the Offering/Service they want to book. Step 2) Ask if they have a preferred team member or if any available staff member is fine. Step 3) Confirm their preferred appointment date. Step 4) Call get_availability immediately for that offering and date, present the available time slots clearly, and let them choose their preferred time slot. Step 5) ONLY AFTER a specific time slot is chosen, collect their mandatory contact details: Full Name (customer_name) and Phone Number (phone), and optionally ask if they have an email address or special notes. Do NOT ask for their phone number at the beginning of a new booking request. Step 6) Once all required details and slot preference are confirmed, call book_appointment with offering_name, slot_id, customer_name, phone, email, and notes. After booking, state the confirmation code, staff member, service, and local appointment time out loud to the customer. Output only customer-facing speech: never narrate private reasoning, plans, or tool names.`,
    interaction_channel: "web",
    contact_number_policy:
      "For NEW bookings, follow the standard website 'Book Now' flow: first help the customer choose an offering/service, then staff member preference, then date, then check availability and let them select an available time slot. ONLY AFTER a time slot is selected should you ask for their contact details (Full Name and Phone Number). Do NOT ask for a phone number at the start of a new booking request. For EXISTING booking actions (lookup, reschedule, cancellation), you must ask for the contact phone number and confirmation code before invoking lookup tools.",
  };
}
