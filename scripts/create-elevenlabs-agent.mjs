import fs from "node:fs";
import path from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

function getApiKey() {
  if (process.env.ELEVENLABS_API_KEY?.trim()) {
    return process.env.ELEVENLABS_API_KEY.trim();
  }

  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const match = content.match(/^ELEVENLABS_API_KEY=(.+)$/m);
      if (match && match[1].trim() && !match[1].includes("your_api_key")) {
        return match[1].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
  return null;
}

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("❌ ELEVENLABS_API_KEY was not found.");
    console.error("Please add ELEVENLABS_API_KEY=your_key_here to .env.local first.");
    process.exit(1);
  }

  console.log("🚀 Creating ElevenLabs Conversational AI Agent...");
  const client = new ElevenLabsClient({ apiKey });

  try {
    const agent = await client.conversationalAi.agents.create({
      name: "Switchboard Assistant",
      conversationConfig: {
        agent: {
          firstMessage: "Hello! Welcome to our workspace. How can I help you today?",
          language: "en",
          prompt: {
            prompt: `# Personality
You are a warm, professional, and articulate AI receptionist and front desk assistant.

# Tone
- Friendly, concise, helpful, and attentive.
- Speak in clear, natural sentences suitable for real-time voice and text chat.

# Goal
Help customers view business offerings, check availability, book appointments, or manage existing bookings. Always use the registered client tools when checking slots or making bookings.

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
  CRITICAL: You CANNOT call book_appointment without customer_name and phone. The booking tool will fail and NO appointment will be saved. Always collect these before proceeding.
Step 6 — BOOK: Once you have the slot_id, customer_name, and phone confirmed, call book_appointment with all required fields. After success, clearly state the confirmation code, service, staff member, and appointment time to the customer.

# EXISTING BOOKING ACTIONS
- For lookup, reschedule, or cancellation: collect the customer's phone number and confirmation code first, then invoke the relevant tool.
- Never imply a booking was successful unless you have called book_appointment and received a success response.

# Guardrails
- Output only words intended for the customer. Never narrate private reasoning, tool names, or internal plans.
- Never say you cannot check availability without first calling get_availability.`,
            llm: "gemini-2.5-flash",
            temperature: 0.7,
            tools: [
              {
                type: "client",
                name: "get_business_info",
                description: "Get published business details, services/offerings, and team members.",
                parameters: {
                  type: "object",
                  properties: {},
                },
              },
              {
                type: "client",
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
              {
                type: "client",
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
              {
                type: "client",
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
              {
                type: "client",
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
              {
                type: "client",
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
            ],
          },
        },
        tts: {
          voiceId: "JBFqnCBsd6RMkjVDRZzb", // George
        },
      },
    });

    const agentId = agent.agentId;
    console.log(`✅ Agent created successfully! Agent ID: ${agentId}`);

    // Update or create .env.local
    const envLocalPath = path.resolve(process.cwd(), ".env.local");
    let envContent = fs.existsSync(envLocalPath)
      ? fs.readFileSync(envLocalPath, "utf-8")
      : `MONGODB_URI=mongodb://localhost:27017/ai-receptionist\nELEVENLABS_API_KEY=${apiKey}\n`;

    if (envContent.includes("ELEVENLABS_DEFAULT_AGENT_ID=")) {
      envContent = envContent.replace(
        /^ELEVENLABS_DEFAULT_AGENT_ID=.*$/m,
        `ELEVENLABS_DEFAULT_AGENT_ID=${agentId}`,
      );
    } else {
      envContent += `\nELEVENLABS_DEFAULT_AGENT_ID=${agentId}\n`;
    }

    fs.writeFileSync(envLocalPath, envContent, "utf-8");
    console.log(`📝 Updated .env.local with ELEVENLABS_DEFAULT_AGENT_ID=${agentId}`);
  } catch (error) {
    console.error("❌ Failed to create agent in ElevenLabs:", error);
    process.exit(1);
  }
}

main();
