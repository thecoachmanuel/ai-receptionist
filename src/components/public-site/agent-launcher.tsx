"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ConversationProvider,
  useConversationControls,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react";
import {
  AudioLines,
  Bot,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  MessageCircle,
  Mic,
  Send,
  ShieldCheck,
  Square,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import Vapi from "@vapi-ai/web";

import {
  AgentClientToolRegistrar,
  createAgentClientTools,
  type AgentToolActivity,
  type AgentToolEvent,
  type AgentToolName,
} from "@/components/public-site/agent-tools";
import type {
  PublicOffering,
  PublicTeamMember,
} from "@/components/public-site/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SessionResponse = {
  provider?: "elevenlabs" | "gemini" | "vapi";
  model?: string;
  signedUrl?: string;
  conversationToken?: string;
  vapiPublicKey?: string;
  vapiAssistantId?: string;
  sessionId?: string;
  dynamicVariables?: Record<string, string>;
};

type ChatMessage = {
  kind: "message";
  id: string;
  role: "user" | "agent";
  text: string;
};

type ChatToolCall = AgentToolEvent & {
  kind: "tool";
};

type ChatTimelineItem = ChatMessage | ChatToolCall;

type AgentLauncherProps = {
  siteSlug: string;
  businessName: string;
  welcomeMessage: string;
  textEnabled: boolean;
  voiceEnabled: boolean;
  offerings: PublicOffering[];
  teamMembers: PublicTeamMember[];
  timezone: string;
  locale: string;
  voiceGender?: "female" | "male";
  onActivity?: (activity: AgentToolActivity) => void;
};

function activityTitle(kind: AgentToolActivity["kind"]) {
  if (kind === "booked") return "Booking confirmed";
  if (kind === "rescheduled") return "Booking rescheduled";
  if (kind === "canceled") return "Booking canceled";
  return "Booking found";
}

const TOOL_LABELS: Record<AgentToolName, string> = {
  get_business_info: "Loading business details",
  get_availability: "Checking availability",
  book_appointment: "Creating booking",
  lookup_appointment: "Finding booking",
  reschedule_appointment: "Rescheduling booking",
  cancel_appointment: "Canceling booking",
};

function ToolCallItem({ item }: { item: ChatToolCall }) {
  const isRunning = item.status === "running";
  const isFailed = item.status === "failed";

  return (
    <div
      className={cn(
        "w-full rounded-xl border bg-background/75 px-3 py-2.5 shadow-sm",
        isFailed ? "border-destructive/25" : "border-foreground/10",
      )}
      aria-label={`${TOOL_LABELS[item.name]}: ${item.status}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground",
            isRunning && "bg-primary/10 text-primary",
            isFailed && "bg-destructive/10 text-destructive",
          )}
        >
          {isRunning ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          ) : isFailed ? (
            <CircleAlert className="size-3.5" aria-hidden="true" />
          ) : (
            <Wrench className="size-3.5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs font-semibold">{TOOL_LABELS[item.name]}</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-[0.62rem] text-muted-foreground">
              {item.name}
            </code>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {item.inputSummary}
          </p>
          {item.resultSummary ? (
            <p
              className={cn(
                "mt-1 text-xs font-medium leading-5",
                isFailed ? "text-destructive" : "text-foreground",
              )}
            >
              {item.resultSummary}
            </p>
          ) : null}
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[0.58rem] uppercase tracking-wider",
            isRunning && "border-primary/20 text-primary",
            isFailed && "border-destructive/20 text-destructive",
          )}
        >
          {isRunning ? "Running" : isFailed ? "Failed" : "Done"}
        </Badge>
      </div>
    </div>
  );
}

function formatError(err: unknown): string {
  if (!err) return "The AI assistant is unavailable right now.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || "The AI assistant is unavailable right now.";
  if (typeof err === "object") {
    const obj = err as Record<string, any>;
    if (typeof obj.message === "string" && obj.message) return obj.message;
    if (typeof obj.error === "string" && obj.error) return obj.error;
    if (obj.error && typeof obj.error === "object") {
      if (typeof obj.error.message === "string" && obj.error.message) return obj.error.message;
      if (typeof obj.error.error === "string" && obj.error.error) return obj.error.error;
    }
    try {
      const str = JSON.stringify(err);
      if (str && str !== "{}" && str !== "null") return str;
    } catch {
      // ignore
    }
  }
  return "Voice connection issue. Please check microphone access or try again.";
}

function AgentLauncherInner({
  siteSlug,
  businessName,
  welcomeMessage,
  textEnabled,
  voiceEnabled,
  offerings,
  teamMembers,
  timezone,
  locale,
  voiceGender,
  timeline,
  toolActivity,
  clearTimeline,
  addUserMessage,
  addAgentMessage,
  onActivity,
  onToolEvent,
}: {
  siteSlug: string;
  businessName: string;
  welcomeMessage: string;
  textEnabled: boolean;
  voiceEnabled: boolean;
  offerings: PublicOffering[];
  teamMembers: PublicTeamMember[];
  timezone: string;
  locale: string;
  voiceGender: "female" | "male";
  timeline: ChatTimelineItem[];
  toolActivity: AgentToolActivity | null;
  clearTimeline: () => void;
  addUserMessage: (text: string) => void;
  addAgentMessage: (text: string) => void;
  onActivity: (activity: AgentToolActivity) => void;
  onToolEvent: (event: AgentToolEvent) => void;
}) {
  const [isRequestingSession, setIsRequestingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sessionKind, setSessionKind] = useState<"text" | "voice" | null>(null);
  const [activeProvider, setActiveProvider] = useState<"elevenlabs" | "gemini" | "vapi">("vapi");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const recognitionRef = useRef<any>(null);
  const vapiRef = useRef<any>(null);
  const vapiSessionIdRef = useRef<string | null>(null);

  const { startSession, endSession, sendUserMessage } = useConversationControls();
  const { status, message: statusMessage } = useConversationStatus();
  const { mode } = useConversationMode();

  const isConnected = activeProvider === "elevenlabs" ? status === "connected" : sessionKind !== null;
  const isConnecting = (status === "connecting" || isRequestingSession || geminiLoading);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript || !followLatestRef.current) return;
    const frame = requestAnimationFrame(() => {
      transcript.scrollTop = transcript.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [timeline]);

  function handleTranscriptScroll() {
    const transcript = transcriptRef.current;
    if (!transcript) return;
    followLatestRef.current =
      transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight <
      48;
  }

  function speakText(text: string) {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = voiceGender === "male" ? 0.8 : 1.1;

      const trySetVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) return; // not loaded yet

        const enVoices = voices.filter((v) => v.lang.startsWith("en"));

        // Gender keywords for matching
        const femaleKeywords = ["female", "woman", "zira", "samantha", "victoria", "karen", "moira", "fiona", "google uk english female", "google us english"];
        const maleKeywords = ["male", "man", "david", "mark", "daniel", "alex", "fred", "google uk english male"];
        const keywords = voiceGender === "male" ? maleKeywords : femaleKeywords;

        // Try gender-matched online/natural voice first
        let chosen = enVoices.find((v) =>
          keywords.some((kw) => v.name.toLowerCase().includes(kw)) &&
          (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Online"))
        );
        // Fallback: any gender-matched voice
        if (!chosen) chosen = enVoices.find((v) => keywords.some((kw) => v.name.toLowerCase().includes(kw)));
        // Last resort: any english voice
        if (!chosen) chosen = enVoices[0];

        if (chosen) utterance.voice = chosen;
        window.speechSynthesis.speak(utterance);
      };

      // Voices may not be loaded immediately — retry once after they load
      if (window.speechSynthesis.getVoices().length > 0) {
        trySetVoice();
      } else {
        window.speechSynthesis.addEventListener("voiceschanged", trySetVoice, { once: true });
        window.speechSynthesis.speak(utterance); // speak anyway so it doesn't feel stuck
      }
    }
  }

  function startVoiceRecognition() {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error("Browser speech recognition is not supported in this browser. Please type your message.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = locale || "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcriptText = event.results[0]?.[0]?.transcript;
        if (transcriptText) {
          handleSendGemini(transcriptText);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  }

  const [slotRegistry] = useState(() => new Map<string, any>());
  const clientTools = useMemo(() => createAgentClientTools({
    siteSlug,
    businessName,
    offerings,
    teamMembers,
    timezone,
    locale,
    onActivity,
    onToolEvent,
    slotRegistry,
  }), [siteSlug, businessName, offerings, teamMembers, timezone, locale, onActivity, onToolEvent, slotRegistry]);

  async function handleSendGemini(textToSend: string, skipAddingUserMessage = false) {
    if (!textToSend.trim() || (geminiLoading && !skipAddingUserMessage)) return;
    const userMessageText = textToSend.trim();
    
    if (!skipAddingUserMessage) {
      addUserMessage(userMessageText);
      setMessage("");
      setGeminiLoading(true);
    }

    try {
      const history = timeline
        .filter((item): item is ChatMessage => item.kind === "message")
        .map((m) => ({ role: m.role, content: m.text }));

      const response = await fetch(`/api/public/${encodeURIComponent(siteSlug)}/gemini-chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: userMessageText, history }),
      });

      const data = await response.json();
      if (!response.ok || !data.reply) {
        throw new Error(data.error || "Gemini receptionist error.");
      }

      addAgentMessage(data.reply);
      if (sessionKind === "voice") {
        speakText(data.reply);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect to Gemini receptionist.");
    } finally {
      setGeminiLoading(false);
    }
  }

  const vapiDynamicVarsRef = useRef<any>(null);

  async function handleSendVapi(textToSend: string | { role: string; toolCallId: string; content: string }[], isToolCall = false) {
    if (!isToolCall && (typeof textToSend === 'string' && !textToSend.trim())) return;
    if (!isToolCall && geminiLoading) return;
    
    if (!isToolCall && typeof textToSend === 'string') {
      const userMessageText = textToSend.trim();
      addUserMessage(userMessageText);
      setMessage("");
      setGeminiLoading(true);
    }

    try {
      const response = await fetch(`/api/public/${encodeURIComponent(siteSlug)}/vapi-chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isToolCall
            ? {
                toolResults: textToSend,
                sessionId: vapiSessionIdRef.current,
                dynamicVariables: vapiDynamicVarsRef.current,
              }
            : {
                message: textToSend,
                sessionId: vapiSessionIdRef.current,
                dynamicVariables: vapiDynamicVarsRef.current,
              }
        ),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Vapi receptionist error.");
      }

      if (data.chatId && !vapiSessionIdRef.current) {
        vapiSessionIdRef.current = data.chatId;
      }
      
      if (data.toolCalls && data.toolCalls.length > 0) {
        const results = [];
        for (const toolCall of data.toolCalls) {
          try {
            if (toolCall.type === "function") {
              const { name, arguments: argsString } = toolCall.function;
              const args = argsString ? (typeof argsString === "string" ? JSON.parse(argsString) : argsString) : {};
              
              if (name in clientTools) {
                const result = await (clientTools as any)[name](args);
                results.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  toolCallId: toolCall.id,
                  name: toolCall.function?.name,
                  content: typeof result === "string" ? result : JSON.stringify(result),
                  result: typeof result === "string" ? result : JSON.stringify(result),
                });
              } else {
                results.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  toolCallId: toolCall.id,
                  name: toolCall.function?.name,
                  content: JSON.stringify({ success: false, error: `Tool '${name}' is not available.` }),
                  result: JSON.stringify({ success: false, error: `Tool '${name}' is not available.` }),
                });
              }
            }
          } catch (err) {
            // Return the ACTUAL error message back to Vapi so the AI understands
            // what went wrong and can ask the customer for the missing information.
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
            console.error("Vapi text tool execution error:", err);
            results.push({
              role: "tool",
              tool_call_id: toolCall.id,
              toolCallId: toolCall.id,
              name: toolCall.function?.name,
              content: JSON.stringify({ success: false, error: errorMessage }),
              result: JSON.stringify({ success: false, error: errorMessage }),
            });
          }
        }
        
        if (results.length > 0) {
          // Recursively send the tool results back to vapi
          await handleSendVapi(results, true);
        }
      } else if (data.reply) {
        if (data.reply.includes("I'm sorry, I couldn't process that just now")) {
          throw new Error("VAPI fallback required");
        }
        addAgentMessage(data.reply);
      }
    } catch (err) {
      console.warn("VAPI chat failed, falling back to Gemini:", err);
      if (typeof textToSend === "string") {
        await handleSendGemini(textToSend, true);
      }
    } finally {
      if (!isToolCall) {
        setGeminiLoading(false);
      }
    }
  }

  async function start(kind: "text" | "voice") {
    setSessionError(null);
    setIsRequestingSession(true);
    setSessionKind(kind);
    followLatestRef.current = true;
    clearTimeline();

    try {
      const response = await fetch(
        `/api/public/${encodeURIComponent(siteSlug)}/agent-session`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode: kind }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as
        | SessionResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The AI assistant is unavailable right now.",
        );
      }

      const session = payload as SessionResponse;

      if (session.provider === "gemini") {
        setActiveProvider("gemini");
        const greeting = welcomeMessage || `Hello! I'm the front-desk AI assistant for ${businessName}. How can I help you today?`;
        addAgentMessage(greeting);
        if (kind === "voice") {
          speakText(greeting);
        }
        return;
      }

      if (session.provider === "vapi") {
        setActiveProvider("vapi");
        
        if (kind === "text") {
          throw new Error("Vapi AI is configured for voice interaction only. Please click 'Speak with AI'.");
        }

        if (!session.vapiAssistantId || !session.vapiPublicKey) {
          throw new Error("Vapi AI assistant ID or public key is not configured in admin settings.");
        }

        const vapi = new Vapi(session.vapiPublicKey);
        vapiRef.current = vapi;
        
        vapi.on("error", (e: any) => {
          console.error("Vapi event error:", e);
          setSessionError(formatError(e));
        });

        vapi.on("message", async (msg: any) => {
          if (msg.type === "transcript" && msg.transcriptType === "final") {
            const role = msg.role === "user" ? "user" : "agent";
            const text = msg.transcript;
            if (role === "user") {
              addUserMessage(text);
            } else {
              addAgentMessage(text);
            }
          } else if (msg.type === "tool-calls") {
            const results = [];
            const toolCallList = msg.toolCallList || msg.toolCalls || msg.tool_calls || msg.toolWithToolCallList || [];
            for (const toolCall of toolCallList) {
              try {
                if (toolCall.type === "function") {
                  const { name, arguments: argsString } = toolCall.function;
                  const args = argsString ? (typeof argsString === "string" ? JSON.parse(argsString) : argsString) : {};
                  
                  if (name in clientTools) {
                    const result = await (clientTools as any)[name](args);
                    const resultStr = typeof result === "string" ? result : JSON.stringify(result);
                    results.push({
                      toolCallId: toolCall.id,
                      id: toolCall.id,
                      tool_call_id: toolCall.id,
                      name,
                      result: resultStr,
                      content: resultStr,
                    });
                  } else {
                    const errStr = JSON.stringify({ error: "Tool not found" });
                    results.push({
                      toolCallId: toolCall.id,
                      id: toolCall.id,
                      tool_call_id: toolCall.id,
                      name,
                      error: "Tool not found",
                      result: errStr,
                      content: errStr,
                    });
                  }
                }
              } catch (err) {
                console.error("Vapi tool execution error:", err);
                const errStr = JSON.stringify({ error: err instanceof Error ? err.message : "Failed to execute tool" });
                results.push({
                  toolCallId: toolCall.id,
                  id: toolCall.id,
                  tool_call_id: toolCall.id,
                  name: toolCall.function?.name,
                  error: err instanceof Error ? err.message : "Failed to execute tool",
                  result: errStr,
                  content: errStr,
                });
              }
            }
            
            if (results.length > 0) {
              for (const res of results) {
                vapi.send({
                  type: "add-message",
                  message: {
                    role: "tool",
                    tool_call_id: res.toolCallId,
                    name: res.name,
                    content: res.content,
                  },
                } as any);

                vapi.send({
                  type: "add-message",
                  message: {
                    role: "system",
                    content: `[System Note: Tool "${res.name}" execution completed. Result:\n${res.content}\n\nINSTRUCTION: Immediately synthesize these findings into a clear, natural spoken response to the customer out loud without pausing or waiting for another user prompt.]`,
                  },
                } as any);
              }
            }
          }
        });

        vapiDynamicVarsRef.current = session.dynamicVariables;

        vapi.on("call-end", () => {
          stop();
        });

        const greeting = welcomeMessage || `Hello! I'm the front-desk AI assistant for ${businessName}. How can I help you today?`;
        addAgentMessage(greeting);

        await vapi.start(session.vapiAssistantId || "", {
          firstMessageMode: "assistant-speaks-first",
          firstMessage: greeting,
          variableValues: session.dynamicVariables,
        });
        return;
      }

      // Vapi provider default
      setActiveProvider(session.provider || "vapi");
      const sharedOptions = {
        clientTools,
        dynamicVariables: {
          site_slug: siteSlug,
          business_name: businessName,
          ...session.dynamicVariables,
        },
      };

      if (session.conversationToken) {
        if (kind === "text") {
          throw new Error("Secure text chat is temporarily unavailable.");
        }
        await startSession({
          ...sharedOptions,
          conversationToken: session.conversationToken,
          connectionType: "webrtc",
          textOnly: false,
        });
      } else if (session.signedUrl) {
        await startSession({
          ...sharedOptions,
          signedUrl: session.signedUrl,
          connectionType: "websocket",
          textOnly: kind === "text",
        });
      } else {
        throw new Error("The AI assistant session could not be started.");
      }
    } catch (error) {
      console.error("Agent session error:", error);
      const msg = formatError(error);
      setSessionError(
        kind === "voice" && typeof msg === "string" && /microphone|permission|audio/i.test(msg)
          ? "Microphone access was blocked. Allow access in your browser and try again."
          : msg,
      );
      setSessionKind(null);
    } finally {
      setIsRequestingSession(false);
    }
  }

  async function stop() {
    // Stop any in-flight TTS/STT
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    if (vapiRef.current) {
      try { vapiRef.current.stop(); } catch { /* ignore */ }
      vapiRef.current = null;
    }
    setIsListening(false);

    // Log the transcript before clearing it
    if (timeline.length > 0) {
      const messages = timeline
        .filter((item): item is ChatMessage => item.kind === "message")
        .map((item) => `${item.role === "user" ? "Customer" : "AI"}: ${item.text}`)
        .join("\n");

      if (messages) {
        fetch("/api/data/publicBooking/logConversation", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            siteSlug,
            transcript: messages,
            summary: `Public AI assistant chat session (${timeline.filter((i) => i.kind === "message").length} messages)`,
          }),
        }).catch(() => null);
      }
    }

    // Tear down the ElevenLabs WebSocket session if active
    if (activeProvider === "elevenlabs") {
      await endSession();
    }

    // Reset all session state so the client sees a clean slate
    setSessionKind(null);
    setMessage("");
    setGeminiLoading(false);
    vapiSessionIdRef.current = null;
    clearTimeline();         // ← clears chat history + toolActivity
    setSessionError(null);  // ← dismiss any previous error banners
    followLatestRef.current = true;
  }

  function handleSend(event?: React.FormEvent) {
    event?.preventDefault();
    if (!message.trim()) return;
    if (activeProvider === "gemini" && sessionKind === "text") {
      void handleSendGemini(message);
    } else if (activeProvider === "vapi" && sessionKind === "text") {
      void handleSendVapi(message);
    } else if (activeProvider === "vapi" && sessionKind === "voice") {
      addUserMessage(message);
      if (vapiRef.current) {
        vapiRef.current.send({
          type: "add-message",
          message: { role: "user", content: message },
        });
      }
      setMessage("");
    } else {
      addUserMessage(message);
      void sendUserMessage(message);
      setMessage("");
    }
  }

  return (
    <Card className="border-border/80 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-8 place-items-center rounded-lg bg-primary/10 text-primary",
                isConnected && "bg-emerald-500/10 text-emerald-600",
              )}
            >
              <Bot className="size-4" />
            </span>
            <div>
              <CardTitle className="text-base font-semibold">
                {businessName} Assistant
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                {isConnected
                  ? activeProvider === "gemini"
                    ? "Online · AI Engine"
                    : activeProvider === "vapi"
                    ? "Online · Live Voice (Vapi)"
                    : `Online · ${sessionKind === "voice" ? "Live Voice" : "Text Chat"}`
                  : "AI Front Desk Assistant"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[10px]",
              isConnected
                ? "border-emerald-500/30 text-emerald-600 bg-emerald-50"
                : "text-muted-foreground",
            )}
          >
            {isConnected ? "Active" : "Ready"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {sessionError ? (
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertTitle className="text-xs font-semibold">Connection Error</AlertTitle>
            <AlertDescription className="text-xs">
              {typeof sessionError === "string" ? sessionError : formatError(sessionError)}
            </AlertDescription>
          </Alert>
        ) : null}

        {toolActivity ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="size-4 text-emerald-600" />
              {activityTitle(toolActivity.kind)}
            </div>
            <p className="mt-1 text-xs">{toolActivity.status}</p>
          </div>
        ) : null}

        {/* Chat Transcript Area */}
        {isConnected || timeline.length > 0 ? (
          <div
            ref={transcriptRef}
            onScroll={handleTranscriptScroll}
            className="flex max-h-96 min-h-[300px] flex-col gap-3 overflow-y-auto rounded-xl border bg-muted/20 p-3 text-xs"
          >
            {timeline.length === 0 ? (
              <p className="m-auto text-center text-xs text-muted-foreground italic">
                {welcomeMessage}
              </p>
            ) : (
              timeline.map((item) =>
                item.kind === "tool" ? (
                  <ToolCallItem key={item.id} item={item} />
                ) : (
                  <div
                    key={item.id}
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                      item.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto bg-card border text-foreground shadow-sm",
                    )}
                  >
                    <p className="font-semibold text-[10px] opacity-70 mb-0.5">
                      {item.role === "user" ? "You" : businessName + " AI"}
                    </p>
                    {item.text}
                  </div>
                ),
              )
            )}
          </div>
        ) : null}

        {/* Action Controls */}
        {isConnected ? (
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={sessionKind === "voice" ? "Type or speak to the AI..." : "Ask questions or request booking..."}
              className="text-xs flex-1"
              disabled={geminiLoading}
            />
            {activeProvider === "gemini" && sessionKind === "voice" && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={startVoiceRecognition}
                title="Speak to AI"
              >
                <Mic className={cn("size-4", isListening && "animate-pulse")} />
              </Button>
            )}
            <Button type="submit" size="sm" disabled={!message.trim() || geminiLoading}>
              {geminiLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            {voiceEnabled ? (
              <Button
                type="button"
                variant="default"
                size="lg"
                onClick={() => void start("voice")}
                disabled={isConnecting}
                className="h-12 w-full"
              >
                {isConnecting && sessionKind === "voice" ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Mic data-icon="inline-start" />
                )}
                Speak with AI
              </Button>
            ) : null}
          </div>
        )}

        {isConnected ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void stop()}
            className="h-9 w-full text-xs text-destructive hover:bg-destructive/10"
          >
            <Square className="size-3.5 mr-1.5" /> End conversation
          </Button>
        ) : (
          <p className="text-center text-[0.68rem] leading-4 text-muted-foreground">
            For booking or follow-up requests, the assistant will ask for a
            contact number before continuing.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

class AgentLauncherErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMessage: formatError(error) };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("AgentLauncher error boundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-border/80 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-destructive">
              <CircleAlert className="size-5" />
              <CardTitle className="text-base font-semibold">Assistant Connection Issue</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>{this.state.errorMessage || "The AI assistant is temporarily unavailable. Please try reloading or use online booking."}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, errorMessage: "" })}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

export function AgentLauncher(props: AgentLauncherProps) {
  const [timeline, setTimeline] = useState<ChatTimelineItem[]>([]);
  const [toolActivity, setToolActivity] = useState<AgentToolActivity | null>(
    null,
  );
  const handleToolEvent = useCallback((event: AgentToolEvent) => {
    setTimeline((current) => {
      const index = current.findIndex(
        (item) => item.kind === "tool" && item.id === event.id,
      );
      const nextItem: ChatToolCall = { kind: "tool", ...event };
      if (index === -1) return [...current, nextItem];
      const next = [...current];
      next[index] = nextItem;
      return next;
    });
  }, []);

  return (
    <AgentLauncherErrorBoundary>
      <ConversationProvider
        onMessage={({ message, role, event_id }) => {
        const text = message.trim();
        if (!text) return;
        const id = `${role}-${event_id ?? `${Date.now()}-${Math.random()}`}`;
        setTimeline((current) => {
          const existingIndex = current.findIndex(
            (item) => item.kind === "message" && item.id === id,
          );
          if (existingIndex !== -1) {
            const existing = current[existingIndex];
            if (existing.kind === "message" && existing.text === text) {
              return current;
            }
            const next = [...current];
            next[existingIndex] = { kind: "message", id, role, text };
            return next;
          }
          const previous = current.at(-1);
          if (
            previous?.kind === "message" &&
            previous.role === role &&
            previous.text === text
          ) {
            return current;
          }
          return [
            ...current,
            {
              kind: "message",
              id,
              role,
              text,
            },
          ];
        });
      }}
    >
      <AgentClientToolRegistrar
        siteSlug={props.siteSlug}
        businessName={props.businessName}
        offerings={props.offerings}
        teamMembers={props.teamMembers}
        timezone={props.timezone}
        locale={props.locale}
        onActivity={(activity) => {
          setToolActivity(activity);
          props.onActivity?.(activity);
        }}
        onToolEvent={handleToolEvent}
      />
      <AgentLauncherInner
        siteSlug={props.siteSlug}
        businessName={props.businessName}
        welcomeMessage={props.welcomeMessage}
        textEnabled={props.textEnabled}
        voiceEnabled={props.voiceEnabled}
        offerings={props.offerings}
        teamMembers={props.teamMembers}
        timezone={props.timezone}
        locale={props.locale}
        voiceGender={props.voiceGender ?? "female"}
        timeline={timeline}
        toolActivity={toolActivity}
        clearTimeline={() => {
          setTimeline([]);
          setToolActivity(null);
        }}
        addUserMessage={(text) =>
          setTimeline((current) => [
            ...current,
            {
              kind: "message",
              id: `user-local-${Date.now()}-${Math.random()}`,
              role: "user",
              text,
            },
          ])
        }
        addAgentMessage={(text) =>
          setTimeline((current) => [
            ...current,
            {
              kind: "message",
              id: `agent-local-${Date.now()}-${Math.random()}`,
              role: "agent",
              text,
            },
          ])
        }
        onActivity={setToolActivity}
        onToolEvent={handleToolEvent}
      />
    </ConversationProvider>
    </AgentLauncherErrorBoundary>
  );
}
