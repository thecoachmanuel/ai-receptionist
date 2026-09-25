function formatMoney(
  minor: number | undefined,
  currency = "NGN",
  locale = "en-NG",
): string {
  if (minor === undefined) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

function formatDateTime(value: number, timezone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || "UTC",
    }).format(value);
  } catch {
    return new Date(value).toUTCString();
  }
}

export type MessageType = "confirmation" | "invoice" | "reminder";
export type MessageTone = "friendly" | "professional" | "warm" | "luxury";

export interface BookingWhatsAppPayload {
  customerName: string;
  customerPhone?: string;
  confirmationCode: string;
  offeringName: string;
  offeringPriceMinor: number;
  currency: string;
  locale: string;
  startAt: number;
  timezone: string;
  teamMemberName?: string;
  locationName?: string;
  locationAddress?: string;
  depositSettings?: {
    enabled: boolean;
    percentage: number;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    instructions?: string;
  };
}

export interface BusinessWhatsAppContext {
  businessName: string;
  terminologyOfferingSingular?: string;
  terminologyBookingSingular?: string;
  contactPhone?: string;
  contactEmail?: string;
  aiTone?: MessageTone;
}

/**
 * Built-in intelligent tone-crafted generator.
 * 100% FREE, instant, zero external API keys needed.
 */
function generateTemplateMessage(
  payload: BookingWhatsAppPayload,
  business: BusinessWhatsAppContext,
  type: MessageType,
): string {
  const {
    customerName,
    confirmationCode,
    offeringName,
    offeringPriceMinor,
    currency,
    locale,
    startAt,
    timezone,
    teamMemberName,
    locationName,
    depositSettings,
  } = payload;

  const dateFormatted = new Intl.DateTimeFormat(locale || "en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone || "Africa/Lagos",
  }).format(startAt);

  const totalFormatted = formatPriceMinor(offeringPriceMinor, currency, locale);

  const isDeposit = Boolean(depositSettings?.enabled && depositSettings.percentage > 0 && offeringPriceMinor > 0);
  const depositMinor = isDeposit
    ? Math.round((offeringPriceMinor * depositSettings!.percentage) / 100)
    : 0;
  const balanceMinor = isDeposit
    ? Math.max(0, offeringPriceMinor - depositMinor)
    : 0;
  const depositFormatted = formatPriceMinor(depositMinor, currency, locale);
  const balanceFormatted = formatPriceMinor(balanceMinor, currency, locale);

  const tone = business.aiTone || "warm";

  if (type === "confirmation") {
    const greeting =
      tone === "luxury"
        ? `Dear ${customerName || "Valued Client"},`
        : tone === "professional"
          ? `Hello ${customerName || "there"},`
          : `Hi ${customerName || "there"}! ✨`;

    const intro =
      tone === "luxury"
        ? `We are delighted to confirm your upcoming reservation with *${business.businessName}*.`
        : tone === "professional"
          ? `Your booking with *${business.businessName}* has been confirmed.`
          : `Your appointment with *${business.businessName}* is confirmed! We can't wait to see you.`;

    const lines = [
      greeting,
      ``,
      intro,
      ``,
      `📋 *Booking Code:* \`${confirmationCode}\``,
      `✨ *Service:* ${offeringName}`,
      `📅 *Date & Time:* ${dateFormatted}`,
      teamMemberName ? `👤 *With:* ${teamMemberName}` : null,
      locationName ? `📍 *Location:* ${locationName}` : null,
      ``,
      `💰 *Total Amount:* ${totalFormatted}`,
    ];

    if (isDeposit) {
      lines.push(
        `💵 *Deposit Required (${depositSettings?.percentage}%):* ${depositFormatted}`,
        `💳 *Balance Due at Appointment:* ${balanceFormatted}`,
      );
      if (depositSettings?.bankName && depositSettings?.accountNumber) {
        lines.push(
          ``,
          `🏦 *Bank Transfer Details:*`,
          `• Bank: ${depositSettings.bankName}`,
          `• Account No: \`${depositSettings.accountNumber}\``,
          depositSettings.accountName ? `• Account Name: ${depositSettings.accountName}` : null,
          depositSettings.instructions ? `• Remark: ${depositSettings.instructions}` : null,
        );
      }
    }

    lines.push(
      ``,
      tone === "luxury"
        ? `Should you require any adjustments, please feel free to message us here.`
        : `If you have any questions, simply reply to this message. See you soon!`,
    );

    return lines.filter((l) => l !== null).join("\n");
  }

  if (type === "invoice") {
    const greeting =
      tone === "luxury"
        ? `Dear ${customerName || "Valued Client"},`
        : `Hello ${customerName || "there"},`;

    const lines = [
      greeting,
      ``,
      `Here is your invoice for your upcoming appointment with *${business.businessName}*:`,
      ``,
      `📋 *Booking Reference:* \`${confirmationCode}\``,
      `✨ *Service:* ${offeringName}`,
      `📅 *Appointment Date:* ${dateFormatted}`,
      ``,
      `💰 *Total Cost:* ${totalFormatted}`,
    ];

    if (isDeposit) {
      lines.push(
        `💵 *Required Deposit (${depositSettings?.percentage}%):* ${depositFormatted}`,
        `💳 *Remaining Balance:* ${balanceFormatted}`,
      );
      if (depositSettings?.bankName && depositSettings?.accountNumber) {
        lines.push(
          ``,
          `🏦 *Bank Account to Pay:*`,
          `• Bank: ${depositSettings.bankName}`,
          `• Account No: \`${depositSettings.accountNumber}\``,
        );
        if (depositSettings.accountName) {
          lines.push(`• Account Name: ${depositSettings.accountName}`);
        }
        if (depositSettings.instructions) {
          lines.push(`• Instructions: ${depositSettings.instructions}`);
        }
      }
    }

    lines.push(
      ``,
      `Please reply with your transfer receipt or payment confirmation once made. Thank you!`,
    );

    return lines.join("\n");
  }

  // Reminder
  const greeting =
    tone === "luxury"
      ? `Warm greetings, ${customerName || "Valued Client"}.`
      : `Friendly Reminder: Hi ${customerName || "there"}! 👋`;

  const lines = [
    greeting,
    ``,
    `This is a quick reminder of your upcoming booking with *${business.businessName}*:`,
    ``,
    `✨ *Service:* ${offeringName}`,
    `📅 *When:* ${dateFormatted}`,
    teamMemberName ? `👤 *Specialist:* ${teamMemberName}` : null,
    locationName ? `📍 *Location:* ${locationName}` : null,
    ``,
    isDeposit
      ? `If you have already paid your deposit, thank you! Any remaining balance (${balanceFormatted}) can be completed upon arrival.`
      : `Please arrive 5–10 minutes early so we can make the most of your time.`,
    ``,
    `Looking forward to welcoming you!`,
  ];

  return lines.filter((l) => l !== null).join("\n");
}

function formatPriceMinor(priceMinor: number, currency: string, locale: string): string {
  try {
    const fractionDigits = new Intl.NumberFormat(locale || "en-US", {
      style: "currency",
      currency: currency || "NGN",
    }).resolvedOptions().maximumFractionDigits ?? 2;
    return new Intl.NumberFormat(locale || "en-US", {
      style: "currency",
      currency: currency || "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits,
    }).format(priceMinor / 10 ** fractionDigits);
  } catch {
    return `${currency || "NGN"} ${(priceMinor / 100).toFixed(2)}`;
  }
}

/**
 * Generate a personalized notification message using Free Google Gemini AI
 * with automatic fallback to the built-in intelligent formatter.
 */
export async function generateFreeAIMessage(
  payload: BookingWhatsAppPayload,
  business: BusinessWhatsAppContext,
  type: MessageType,
  geminiApiKey?: string,
): Promise<string> {
  const fallback = generateTemplateMessage(payload, business, type);

  const apiKey = geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  try {
    const prompt = `You are a professional WhatsApp AI receptionist for "${business.businessName}".
Generate a clean, high-converting, professional WhatsApp ${type} message to send to the client.

Client details:
- Name: ${payload.customerName}
- Service: ${payload.offeringName}
- Booking Code: ${payload.confirmationCode}
- Date/Time: ${new Date(payload.startAt).toLocaleString("en-US", { timeZone: payload.timezone })}
- Total Price: ${payload.offeringPriceMinor / 100} ${payload.currency}
${payload.teamMemberName ? `- Staff Member: ${payload.teamMemberName}` : ""}
${payload.locationName ? `- Location: ${payload.locationName}` : ""}
${
  payload.depositSettings?.enabled
    ? `- Deposit Required: ${payload.depositSettings.percentage}%
- Bank Name: ${payload.depositSettings.bankName || "See instructions"}
- Account Number: ${payload.depositSettings.accountNumber || ""}
- Account Name: ${payload.depositSettings.accountName || ""}
- Remark: ${payload.depositSettings.instructions || ""}`
    : ""
}

Tone: ${business.aiTone || "warm, polite, and helpful"}

Rules:
1. Format with WhatsApp markdown (*bold*, \`code\`, bullet points).
2. Keep it concise, friendly, and structured.
3. Include the booking code, date/time, and price breakdown.
4. Output ONLY the message text. No conversational filler or commentary.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 600,
          },
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (generatedText) return generatedText;
    }
  } catch (err) {
    console.warn("Free Gemini AI generation fallback to built-in generator:", err);
  }

  return fallback;
}
