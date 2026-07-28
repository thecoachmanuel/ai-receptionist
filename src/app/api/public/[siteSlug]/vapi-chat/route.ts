import { NextRequest, NextResponse } from "next/server";
import { getElevenLabsSettings } from "@/lib/services/settings";

export const runtime = "nodejs";

const USER_FRIENDLY_REPLIES = {
  default: "I'm sorry, I couldn't process that just now. Please try again in a few seconds.",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  try {
    const { siteSlug } = await params;
    if (!siteSlug) {
      return NextResponse.json({ error: "Missing siteSlug" }, { status: 400 });
    }

    const body = await req.json();
    const { message, sessionId, dynamicVariables, toolResults } = body;

    if (!message && !toolResults) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const aiSettings = await getElevenLabsSettings();
    if (!aiSettings.vapiPrivateKey || !aiSettings.vapiAssistantId) {
      console.error("Vapi Chat: Missing vapiPrivateKey or vapiAssistantId in settings.");
      return NextResponse.json({ 
        success: true, 
        provider: "vapi", 
        reply: USER_FRIENDLY_REPLIES.default 
      });
    }

    const payload: any = {
      assistantId: aiSettings.vapiAssistantId,
      assistantOverrides: {
        variableValues: dynamicVariables || {},
      },
    };

    if (sessionId) {
      payload.previousChatId = sessionId;
    }

    // If this is a tool result submission, format it correctly for Vapi
    if (toolResults && Array.isArray(toolResults) && toolResults.length > 0) {
      // Vapi expects tool results as a messages array with tool role
      payload.messages = toolResults.map((tr: any) => ({
        role: "tool",
        tool_call_id: tr.tool_call_id || tr.toolCallId,
        content: typeof tr.content === "string" ? tr.content : JSON.stringify(tr.content),
      }));
    } else {
      payload.input = typeof message === "string" ? message : JSON.stringify(message);
    }

    const vapiRes = await fetch("https://api.vapi.ai/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aiSettings.vapiPrivateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!vapiRes.ok) {
      const errorText = await vapiRes.text();
      console.error("Vapi Chat API error:", vapiRes.status, errorText);
      return NextResponse.json({ 
        success: true, 
        provider: "vapi", 
        reply: USER_FRIENDLY_REPLIES.default 
      });
    }

    const data = await vapiRes.json();
    const chatId = data.id || data.chatId || data.chat?.id || null;
    
    const toolCalls = 
      data.choices?.[0]?.message?.tool_calls || 
      data.choices?.[0]?.message?.toolCalls || 
      data.message?.tool_calls || 
      data.message?.toolCalls || 
      data.tool_calls || 
      data.toolCalls || 
      [];

    if (toolCalls && toolCalls.length > 0) {
      return NextResponse.json({
        success: true,
        provider: "vapi",
        toolCalls,
        chatId,
      });
    }
    
    // Attempt to extract the text reply. It usually matches OpenAI's choices array,
    // or sometimes Vapi directly returns a message object.
    const reply = 
      data.choices?.[0]?.message?.content || 
      data.message?.content || 
      (typeof data.output === "string" ? data.output : data.output?.content) || 
      (typeof data.content === "string" ? data.content : data.content?.text) || 
      data.text || 
      "I'm sorry, I am having trouble responding right now.";

    return NextResponse.json({ 
      success: true, 
      provider: "vapi", 
      reply,
      chatId,
    });
  } catch (error) {
    console.error("Vapi chat route unhandled error", { error });
    return NextResponse.json(
      { success: true, provider: "vapi", reply: USER_FRIENDLY_REPLIES.default },
      { status: 200 }
    );
  }
}
