import fs from "node:fs";
import path from "node:path";

function getApiKey() {
  if (process.env.VAPI_PRIVATE_KEY?.trim()) {
    return process.env.VAPI_PRIVATE_KEY.trim();
  }

  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const match = content.match(/^VAPI_PRIVATE_KEY=(.+)$/m);
      if (match && match[1].trim() && !match[1].includes("your_private_key")) {
        return match[1].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
  return null;
}

const systemPrompt = `# Personality
You are a warm, professional, articulate, and wise AI receptionist.

# Tone
- Friendly, concise, helpful, and attentive. Speak like a natural human female.
- When quoting the cost of a service, do NOT mention the duration of the service unless the customer specifically asks.
- Always pronounce NGN or Naira fully as "Naira", e.g. "Ten thousand Naira".

# Business Context (CRITICAL)
You are the dedicated AI Receptionist exclusively for: {{business_name}}
Business Announcement/Description: {{business_description}}

Here are the specific offerings/services you provide:
{{business_offerings}}

Here are the team members at this business:
{{business_team}}

# Goal
You represent ONLY this specific business. Do not hallucinate other services, businesses, or team members. 
Help customers view business offerings, check availability, book appointments, or manage existing bookings. Always use the registered client tools when checking slots or making bookings.`;

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

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("❌ VAPI_PRIVATE_KEY was not found.");
    console.error("Please add VAPI_PRIVATE_KEY=your_key_here to .env.local first.");
    process.exit(1);
  }

  console.log("🚀 Creating Vapi AI Assistant...");

  const payload = {
    name: "Switchboard Assistant (Vapi)",
    firstMessageMode: "assistant-speaks-first",
    firstMessage: "Hello! Welcome to our workspace. How can I help you today?",
    voice: {
      provider: "openai",
      voiceId: "nova"
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en-US",
      smartFormat: true,
      endpointing: 250
    },
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

  try {
    const response = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Vapi assistant: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const assistantId = data.id;

    console.log(`✅ Vapi Assistant created successfully! Assistant ID: ${assistantId}`);

    // Update or create .env.local
    const envLocalPath = path.resolve(process.cwd(), ".env.local");
    let envContent = fs.existsSync(envLocalPath)
      ? fs.readFileSync(envLocalPath, "utf-8")
      : `MONGODB_URI=mongodb://localhost:27017/ai-receptionist\nVAPI_PRIVATE_KEY=${apiKey}\n`;

    if (envContent.includes("VAPI_ASSISTANT_ID=")) {
      envContent = envContent.replace(
        /^VAPI_ASSISTANT_ID=.*$/m,
        `VAPI_ASSISTANT_ID=${assistantId}`
      );
    } else {
      envContent += `\nVAPI_ASSISTANT_ID=${assistantId}\n`;
    }

    fs.writeFileSync(envLocalPath, envContent, "utf-8");
    console.log(`📝 Updated .env.local with VAPI_ASSISTANT_ID=${assistantId}`);
    
    console.log(`\n🎉 Next Steps:\n1. Copy the Assistant ID into your Super Admin Dashboard.\n2. Add your Vapi Public Key to the dashboard.\n`);
  } catch (error) {
    console.error("❌ Failed to create agent in Vapi:", error);
    process.exit(1);
  }
}

main();
