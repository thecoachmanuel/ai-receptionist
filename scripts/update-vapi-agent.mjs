import fs from "node:fs";
import path from "node:path";

const VAPI_PUBLIC_KEY = "a37422a8-5cf3-4a63-86fc-83408e926445";
const VAPI_PRIVATE_KEY = "7ea571ee-caa8-41a9-8a02-e60dca7b537f";
const VAPI_ASSISTANT_ID = "55123f5e-bdbb-435b-8814-e590f37fc3b5";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ai-receptionist:tMxnA8Sta9GN2y37@cluster0.0dnl6.mongodb.net/ai-receptionist?appName=Cluster0";

const systemPrompt = `# Personality
You are a warm, professional, articulate, and wise AI assistant.

# Tone
- Friendly, concise, helpful, and attentive. Speak like a natural human female.
- When quoting the cost of a service, do NOT mention the duration of the service unless the customer specifically asks.
- Always pronounce NGN or Naira fully as "Naira", e.g. "Ten thousand Naira".

# Business Context (CRITICAL)
You are the dedicated AI Assistant exclusively for: {{business_name}}
Business Announcement/Description: {{business_description}}
Business Timezone: {{business_timezone}}
All dates, times, and availability check results are strictly in {{business_timezone}}. Always state appointment times to customers in the local time of {{business_name}} ({{business_timezone}}).

Here are the specific offerings/services you provide:
{{business_offerings}}

Here are the team members at this business:
{{business_team}}

# MANDATORY NEW BOOKING FLOW — FOLLOW EXACTLY IN ORDER, NO SKIPPING
When a customer wants to make a new booking, you MUST follow every step below in order. Never skip or reorder any step:

Step 1 — SERVICE: Confirm which service or offering the customer wants to book. Use get_business_info if needed.
Step 2 — STAFF: Ask if they have a preferred team member or if any available staff is fine.
Step 3 — DATE: Ask for their preferred appointment date.
Step 4 — AVAILABILITY: Call get_availability for that offering and date. Present the available time slots clearly. Let the customer choose a specific time and team member.
Step 5 — COLLECT CONTACT DETAILS (MANDATORY — DO NOT SKIP OR PROCEED WITHOUT THESE):
  ONLY after the customer has chosen a specific time slot, ask for their contact details ONE AT A TIME:
  a) Full Name — ask: "May I have your full name for the booking?"
  b) Phone Number — ask: "And what phone number can we reach you on?"
  c) Optionally: email address and any special notes or requests.
  ⚠️ CRITICAL: You CANNOT call book_appointment without customer_name and phone. The booking tool will fail and NO appointment will be saved in the business. Always collect these before proceeding.
Step 6 — BOOK: Once you have the slot_id, customer_name, and phone confirmed, call book_appointment with all required fields. After success, clearly state the confirmation code, service, staff member, and appointment time to the customer.

# EXISTING BOOKING ACTIONS
- For lookup, reschedule, or cancellation: collect the customer's phone number and confirmation code first, then invoke the relevant tool.
- Never imply a booking was successful unless you have called book_appointment and received a success response.

# Goal
You represent ONLY this specific business. Do not hallucinate other services, businesses, or team members.
Help customers view business offerings, check availability, book appointments, or manage existing bookings. Always use the registered client tools when checking slots or making bookings.

# Guardrails
- Output only words intended for the customer. Never narrate private reasoning, tool names, or internal plans.
- Never say you cannot check availability without first calling get_availability.`;

const tools = [
  {
    type: "function",
    async: false,
    function: {
      name: "get_business_info",
      description: "Get published business details, services/offerings, and team members.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
    messages: [
      { type: "request-start", content: "Let me check our business information." }
    ]
  },
  {
    type: "function",
    async: false,
    function: {
      name: "get_availability",
      description: "Check available appointment slots for a specified offering and date (YYYY-MM-DD).",
      parameters: {
        type: "object",
        properties: {
          offering_name: { type: "string" },
          date: { type: "string" },
          team_member_name: { type: "string" },
        },
        required: ["offering_name", "date"],
      },
    },
    messages: [
      { type: "request-start", content: "Let me check the calendar for availability." }
    ]
  },
  {
    type: "function",
    async: false,
    function: {
      name: "book_appointment",
      description: "Book an appointment for a customer using a valid slot_id.",
      parameters: {
        type: "object",
        properties: {
          offering_name: { type: "string" },
          slot_id: { type: "string" },
          customer_name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          notes: { type: "string" },
        },
        required: ["offering_name", "slot_id", "customer_name", "phone"],
      },
    },
    messages: [
      { type: "request-start", content: "I'll go ahead and book that appointment for you now." }
    ]
  },
  {
    type: "function",
    async: false,
    function: {
      name: "lookup_appointment",
      description: "Look up an existing appointment using confirmation code and customer phone number.",
      parameters: {
        type: "object",
        properties: {
          confirmation_code: { type: "string" },
          phone: { type: "string" },
        },
        required: ["confirmation_code", "phone"],
      },
    },
    messages: [
      { type: "request-start", content: "Let me pull up that appointment." }
    ]
  },
  {
    type: "function",
    async: false,
    function: {
      name: "reschedule_appointment",
      description: "Reschedule an existing booking to a new slot_id.",
      parameters: {
        type: "object",
        properties: {
          confirmation_code: { type: "string" },
          phone: { type: "string" },
          slot_id: { type: "string" },
        },
        required: ["confirmation_code", "phone", "slot_id"],
      },
    },
    messages: [
      { type: "request-start", content: "I'll update that appointment for you." }
    ]
  },
  {
    type: "function",
    async: false,
    function: {
      name: "cancel_appointment",
      description: "Cancel an existing booking.",
      parameters: {
        type: "object",
        properties: {
          confirmation_code: { type: "string" },
          phone: { type: "string" },
        },
        required: ["confirmation_code", "phone"],
      },
    },
    messages: [
      { type: "request-start", content: "I'll go ahead and cancel that." }
    ]
  }
];

async function updateVapiAssistant() {
  console.log(`🚀 Updating Vapi AI Assistant ${VAPI_ASSISTANT_ID} on Vapi servers...`);

  const payload = {
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: systemPrompt
        }
      ],
      tools: tools
    }
  };

  const response = await fetch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${VAPI_PRIVATE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update Vapi assistant: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log(`✅ Successfully updated Vapi assistant "${data.name}" (ID: ${data.id}) on Vapi servers!`);
}

async function updateLocalEnv() {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  let envContent = fs.existsSync(envLocalPath)
    ? fs.readFileSync(envLocalPath, "utf-8")
    : `MONGODB_URI=${MONGODB_URI}\n`;

  const keys = {
    MONGODB_URI,
    VAPI_PUBLIC_KEY,
    VAPI_PRIVATE_KEY,
    VAPI_ASSISTANT_ID,
    NEXT_PUBLIC_VAPI_PUBLIC_KEY: VAPI_PUBLIC_KEY
  };

  for (const [key, val] of Object.entries(keys)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${val}`);
    } else {
      envContent += `\n${key}=${val}`;
    }
  }

  fs.writeFileSync(envLocalPath, envContent.trim() + "\n", "utf-8");
  console.log(`📝 Updated .env.local with Vapi keys, Assistant ID, and MongoDB URI.`);
}

async function main() {
  try {
    await updateVapiAssistant();
    await updateLocalEnv();
    console.log(`\n🎉 All Vapi AI details updated successfully! The voice agent will now strictly enforce the mandatory booking flow and capture client bookings.`);
  } catch (err) {
    console.error("❌ Error updating Vapi:", err);
    process.exit(1);
  }
}

main();
