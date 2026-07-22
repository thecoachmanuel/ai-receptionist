"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Sparkles,
  Square,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

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
  provider?: "elevenlabs" | "gemini";
  model?: string;
  signedUrl?: string;
  conversationToken?: string;
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
  const [activeProvider, setActiveProvider] = useState<"elevenlabs" | "gemini">("elevenlabs");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const recognitionRef = useRef<any>(null);

  const { startSession, endSession, sendUserMessage } = useConversationControls();
  const { status, message: statusMessage } = useConversationStatus();
  const { mode } = useConversationMode();

  const isConnected = activeProvider === "gemini" ? sessionKind !== null : status === "connected";
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
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Online")),
      );
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
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

  const clientTools = createAgentClientTools({
    siteSlug,
    businessName,
    offerings,
    teamMembers,
    timezone,
    locale,
    onActivity,
    onToolEvent,
  });

  async function handleSendGemini(textToSend: string) {
    if (!textToSend.trim() || geminiLoading) return;
    const userMessageText = textToSend.trim();
    addUserMessage(userMessageText);
    setMessage("");
    setGeminiLoading(true);

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
            : "The AI concierge is unavailable right now.",
        );
      }

      const session = payload as SessionResponse;

      if (session.provider === "gemini") {
        setActiveProvider("gemini");
        const greeting = welcomeMessage || `Hello! I'm the front-desk AI receptionist for ${businessName}. How can I help you today?`;
        addAgentMessage(greeting);
        if (kind === "voice") {
          speakText(greeting);
        }
        return;
      }

      // ElevenLabs provider
      setActiveProvider("elevenlabs");
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
        throw new Error("The AI concierge session could not be started.");
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "The AI concierge is unavailable right now.";
      setSessionError(
        kind === "voice" && /microphone|permission|audio/i.test(msg)
          ? "Microphone access was blocked. Allow access in your browser or start a text chat instead."
          : msg,
      );
      setSessionKind(null);
    } finally {
      setIsRequestingSession(false);
    }
  }

  async function stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
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
            summary: `Public AI concierge chat session (${timeline.filter((i) => i.kind === "message").length} messages)`,
          }),
        }).catch(() => null);
      }
    }
    if (activeProvider === "elevenlabs") {
      await endSession();
    }
    setSessionKind(null);
    setMessage("");
  }

  function handleSend(event?: React.FormEvent) {
    event?.preventDefault();
    if (!message.trim()) return;
    if (activeProvider === "gemini") {
      void handleSendGemini(message);
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
              {activeProvider === "gemini" ? <Sparkles className="size-4" /> : <Bot className="size-4" />}
            </span>
            <div>
              <CardTitle className="text-base font-semibold">
                {businessName} Receptionist
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                {isConnected
                  ? activeProvider === "gemini"
                    ? "Online · Gemini AI Engine"
                    : `Online · ${sessionKind === "voice" ? "Live Voice" : "Text Chat"}`
                  : "AI Front Desk Concierge"}
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
            <AlertDescription className="text-xs">{sessionError}</AlertDescription>
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
            className="flex max-h-72 min-h-48 flex-col gap-3 overflow-y-auto rounded-xl border bg-muted/20 p-3 text-xs"
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
          <div className="grid gap-2 sm:grid-cols-2">
            {textEnabled ? (
              <Button
                type="button"
                size="lg"
                onClick={() => void start("text")}
                disabled={isConnecting}
                className="h-12"
              >
                {isConnecting && sessionKind === "text" ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <MessageCircle data-icon="inline-start" />
                )}
                Chat with AI
              </Button>
            ) : null}
            {voiceEnabled ? (
              <Button
                type="button"
                variant={textEnabled ? "outline" : "default"}
                size="lg"
                onClick={() => void start("voice")}
                disabled={isConnecting}
                className="h-12"
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
            For booking or follow-up requests, the concierge will ask for a
            contact number before continuing.
          </p>
        )}
      </CardContent>
    </Card>
  );
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
        onActivity={setToolActivity}
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
  );
}
