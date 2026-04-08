"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type MenuOption = {
  label: string;
  value: string;
  description: string;
};

type VoiceStatus = "idle" | "listening" | "thinking" | "speaking";

type MenuItem = {
  key: string;
  label: string;
};

const MAIN_MENU_OPTIONS: MenuOption[] = [
  {
    label: "1. Explore CIBN",
    value: "1",
    description:
      "Learn what CIBN is, see whether it fits, and explore membership options and quizzes.",
  },
  {
    label: "2. I'm a Member",
    value: "2",
    description: "Get support, structure, and practical next steps.",
  },
  {
    label: "3. Tools",
    value: "3",
    description: "Explore the Chrome Extension, LinkedIn, Meetn, and Nolodex.",
  },
  {
    label: "4. Training",
    value: "4",
    description:
      "See training programs, membership levels, onboarding, courses, and video library options.",
  },
];

function cleanMessage(text: string): string {
  return text.replace(/\[\[CTX:[^\]]+\]\]/g, "").trim();
}

function makeSpeechFriendly(text: string): string {
  return cleanMessage(text)
    .replace(/https?:\/\/[^\s)]+/g, "the link is shown in the chat")
    .replace(/\s+/g, " ")
    .trim();
}

function withAudioPrompt(text: string): string {
  const clean = makeSpeechFriendly(text);
  if (!clean) return "";
  return `${clean}\n\nWhat would you like to do next?`;
}

function removeNextPrompt(content: string): string {
  return content
    .replace(/\*\*what would you like (to do next|to explore next|next)\?\*\*/gi, "")
    .replace(/what would you like (to do next|to explore next|next)\?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseMenuItems(content: string): MenuItem[] {
  const lines = content.split("\n");
  const items: MenuItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^([A-Z]|\d+)\.\s+(.+)$/);
    if (match) {
      items.push({ key: match[1], label: match[2] });
    }
  }

  return items;
}

function stripListLines(content: string): string {
  return content
    .split("\n")
    .filter((line) => !line.trim().match(/^([A-Z]|\d+)\.\s+.+$/))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderInlineContent(text: string): ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s]+|\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    const isUrl = /^https?:\/\/[^\s]+$/.test(part);
    const isBold = /^\*\*[^*]+\*\*$/.test(part);

    if (isUrl) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "rgb(29,78,216)",
            textDecoration: "underline",
            wordBreak: "break-word",
            fontWeight: 600,
          }}
        >
          {part}
        </a>
      );
    }

    if (isBold) {
      return <strong key={index}>{part.replace(/\*\*/g, "")}</strong>;
    }

    return <span key={index}>{part}</span>;
  });
}

function renderFormattedMessage(content: string): ReactNode {
  const cleaned = removeNextPrompt(content);
  const lines = cleaned.split("\n");

  return (
    <div>
      {lines.map((rawLine, index) => {
        const trimmed = rawLine.trim();

        if (!trimmed) return <div key={index} style={{ height: 10 }} />;

        const isHeadingOnly = /^\*\*[^*]+\*\*$/.test(trimmed);
        const isBullet = /^-\s+/.test(trimmed);
        const isNumbered = /^\d+\.\s+/.test(trimmed);
        const isLettered = /^[A-Z]\.\s+/.test(trimmed);

        if (isHeadingOnly) {
          return (
            <div
              key={index}
              style={{
                fontWeight: 700,
                fontSize: 22,
                color: "rgb(0,0,0)",
                marginTop: 16,
                marginBottom: 10,
              }}
            >
              {trimmed.replace(/\*\*/g, "")}
            </div>
          );
        }

        if (isBullet || isNumbered || isLettered) {
          return (
            <div
              key={index}
              style={{
                paddingLeft: 24,
                marginBottom: 10,
                lineHeight: 1.8,
                fontSize: 19,
                color: "rgb(0,0,0)",
              }}
            >
              {renderInlineContent(trimmed)}
            </div>
          );
        }

        return (
          <div
            key={index}
            style={{
              marginBottom: 12,
              lineHeight: 1.85,
              fontSize: 19,
              color: "rgb(0,0,0)",
            }}
          >
            {renderInlineContent(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

function MicIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "white" : "rgb(15,29,77)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  );
}

function ThinkingMessages() {
  const messages = [
    "Kerry is thinking...",
    "Looking that up for you...",
    "Great question, one moment...",
    "Almost there...",
  ];

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % messages.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        fontSize: 18,
        fontWeight: 600,
        color: "rgb(71,85,105)",
        fontStyle: "italic",
        padding: "8px 4px 4px",
      }}
    >
      {messages[idx]}
    </div>
  );
}

function SparkIndicator({ state }: { state: VoiceStatus }) {
  if (state === "idle") return null;

  const config = {
    idle: { label: "", color: "#cbd5e1" },
    thinking: { label: "Thinking", color: "#f0c14d" },
    speaking: { label: "Speaking", color: "#3b82f6" },
    listening: { label: "Listening", color: "#22c55e" },
  }[state];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.9)",
        border: "1px solid rgb(226,232,240)",
      }}
    >
      <div
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: config.color,
        }}
      />
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "rgb(71,85,105)",
        }}
      >
        {config.label}
      </span>
    </div>
  );
}

function SidebarSection({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: 13,
        color: "rgb(240,193,77)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontWeight: 700,
        padding: "18px 6px 10px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        marginTop: 6,
      }}
    >
      {title}
    </div>
  );
}

function SidebarExternalLink({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textDecoration: "none",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 9,
        padding: "12px 13px",
        marginBottom: 6,
        background: "rgba(255,255,255,0.06)",
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span
        style={{
          color: "rgba(255,255,255,0.92)",
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span
        style={{
          marginLeft: "auto",
          color: "rgba(255,255,255,0.45)",
          fontSize: 13,
        }}
      >
        ↗
      </span>
    </a>
  );
}

function SidebarActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textDecoration: "none",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 9,
        padding: "12px 13px",
        marginBottom: 6,
        background: "rgba(255,255,255,0.06)",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span
        style={{
          color: "rgba(255,255,255,0.92)",
          fontSize: 15,
          fontWeight: 600,
          textAlign: "left",
        }}
      >
        {label}
      </span>
      <span
        style={{
          marginLeft: "auto",
          color: "rgba(255,255,255,0.45)",
          fontSize: 13,
        }}
      >
        →
      </span>
    </button>
  );
}

export default function Page() {
  const [stage, setStage] = useState<"welcome" | "chat">("welcome");
  const [activeTopicLabel, setActiveTopicLabel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioLoadingIndex, setAudioLoadingIndex] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestMessageRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopRecordingTimeoutRef = useRef<number | null>(null);
  const audioUnlockedRef = useRef(false);

  const visibleMessages = useMemo(
    () => messages.map((m) => ({ ...m, content: cleanMessage(m.content) })),
    [messages]
  );

  useEffect(() => {
    if (latestMessageRef.current) {
      latestMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [visibleMessages]);

  useEffect(() => {
    return () => {
      if (stopRecordingTimeoutRef.current) {
        window.clearTimeout(stopRecordingTimeoutRef.current);
      }
      audioRef.current?.pause();
      audioRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  async function unlockAudioIfNeeded() {
    if (audioUnlockedRef.current) return;

    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;

      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      await ctx.resume();
      audioUnlockedRef.current = true;
    } catch {
      // ignore
    }
  }

  function clearStopRecordingTimeout() {
    if (stopRecordingTimeoutRef.current) {
      window.clearTimeout(stopRecordingTimeoutRef.current);
      stopRecordingTimeoutRef.current = null;
    }
  }

  function stopCurrentAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setVoiceStatus("idle");
    }
  }

  async function playAssistantMessage(text: string, index: number) {
    const audioText = withAudioPrompt(text);
    if (!audioText) return;

    await unlockAudioIfNeeded();
    setAudioLoadingIndex(index);
    setError("");
    setVoiceStatus("speaking");

    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: audioText }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Could not create audio.");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      stopCurrentAudio();

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setVoiceStatus("idle");
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setVoiceStatus("idle");
      };

      await audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio could not be played.");
      setVoiceStatus("idle");
    } finally {
      setAudioLoadingIndex(null);
    }
  }

  async function sendMessage(
    rawValue: string,
    autoSpeak = false,
    overrideHistory?: Message[]
  ) {
    const value = rawValue.trim();
    if (!value || isLoading) return;

    setError("");
    setVoiceStatus("thinking");
    await new Promise((resolve) => setTimeout(resolve, 250));

    const baseHistory = overrideHistory ?? messages;
    const nextHistory: Message[] = [...baseHistory, { role: "user", content: value }];

    setMessages(nextHistory);
    setInput("");
    setStage("chat");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, history: nextHistory }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Something went wrong.");
      }

      const assistantText =
        typeof data?.text === "string"
          ? data.text
          : typeof data?.error === "string"
          ? data.error
          : "I'm sorry — I couldn't load that response.";

      const assistantIndex = nextHistory.length;

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
      setVoiceStatus("idle");

      if (autoSpeak) {
        await playAssistantMessage(assistantText, assistantIndex);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setVoiceStatus("idle");
    } finally {
      setIsLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Could not transcribe audio.");
    }

    return typeof data?.text === "string" ? data.text.trim() : "";
  }

  async function startRecording() {
    if (isRecording || isLoading) return;

    clearStopRecordingTimeout();
    stopCurrentAudio();
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        clearStopRecordingTimeout();

        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);

        if (audioBlob.size === 0) {
          setVoiceStatus("idle");
          return;
        }

        try {
          setIsLoading(true);
          setVoiceStatus("thinking");
          const transcript = await transcribeAudio(audioBlob);

          if (!transcript) {
            setVoiceStatus("idle");
            return;
          }

          await sendMessage(transcript, true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not use microphone.");
          setVoiceStatus("idle");
        } finally {
          setIsLoading(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setVoiceStatus("listening");

      stopRecordingTimeoutRef.current = window.setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          mediaRecorderRef.current.stop();
        }
      }, 8000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Microphone access was not allowed."
      );
      setVoiceStatus("idle");
    }
  }

  function stopRecording() {
    clearStopRecordingTimeout();

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      return;
    }

    mediaRecorderRef.current.stop();
  }

  function handleMicClick() {
    if (isRecording) stopRecording();
    else void startRecording();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  function startFreshTopic(firstMessage: string, label: string) {
    stopCurrentAudio();
    setActiveTopicLabel(label);
    setSidebarOpen(false);
    setInput("");
    setError("");
    setStage("chat");
    setVoiceStatus("idle");

    const freshHistory: Message[] = [];
    setMessages(freshHistory);

    void sendMessage(firstMessage, false, freshHistory);
  }

  function chooseMainMenu(value: string, label: string) {
    startFreshTopic(value, label);
  }

  function goToMainMenu() {
    stopCurrentAudio();
    setActiveTopicLabel(null);
    setMessages([]);
    setStage("welcome");
    setSidebarOpen(false);
    setInput("");
    setError("");
    setVoiceStatus("idle");
  }

  const headerActionBase: React.CSSProperties = {
    textDecoration: "none",
    borderRadius: 999,
    padding: "10px 16px",
    fontWeight: 700,
    fontSize: 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    transition: "all 0.2s ease",
  };

  const bottomButtonStyle: React.CSSProperties = {
    background: "rgb(255,255,255)",
    color: "rgb(15,29,77)",
    border: "1px solid rgb(209,213,219)",
    borderRadius: 999,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(15,29,77,0.06)",
  };

  const smallActionButton: React.CSSProperties = {
    background: "rgb(255,255,255)",
    color: "rgb(15,29,77)",
    border: "1px solid rgb(209,213,219)",
    borderRadius: 999,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  };

  const menuItemButtonStyle: React.CSSProperties = {
    background: "rgb(255,255,255)",
    color: "rgb(15,29,77)",
    border: "1px solid rgb(209,213,219)",
    borderRadius: 10,
    padding: "12px 18px",
    fontSize: 17,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 2px 8px rgba(15,29,77,0.06)",
    transition: "all 0.15s ease",
  };

  const SidebarContent = (
    <div
      style={{
        width: 260,
        background:
          "linear-gradient(180deg, rgb(15,29,77) 0%, rgb(22,42,102) 100%)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        height: "100%",
      }}
    >
      <div
        style={{
          width: "100%",
          flexShrink: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <img
          src="/kerry_george.jpg"
          alt="Kerry George"
          style={{
            width: "100%",
            display: "block",
            objectFit: "cover",
            objectPosition: "top",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background:
              "linear-gradient(to top, rgba(15,29,77,0.95) 0%, transparent 100%)",
            padding: "24px 16px 14px",
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.95)",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            Kerry George
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              marginTop: 3,
            }}
          >
            Founder, CIBN Connect
          </div>
        </div>
      </div>

      <div style={{ padding: "0 14px 24px" }}>
        <SidebarSection title="Topics" />

        {MAIN_MENU_OPTIONS.map((item) => {
          const isActive = activeTopicLabel === item.label;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => chooseMainMenu(item.value, item.label)}
              style={{
                width: "100%",
                textAlign: "left",
                background: isActive
                  ? "rgba(255,255,255,0.15)"
                  : "rgba(255,255,255,0.04)",
                border: isActive
                  ? "1px solid rgba(255,255,255,0.25)"
                  : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "13px 14px",
                marginBottom: 7,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  color: isActive ? "rgb(255,255,255)" : "rgba(255,255,255,0.92)",
                  fontSize: 15,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {item.description}
              </div>
            </button>
          );
        })}

        <SidebarSection title="Resources" />
        <SidebarActionButton
          label="Member Events Info"
          icon="📅"
          onClick={() => {
            startFreshTopic("Member Events Info", "Member Events Info");
          }}
        />
        <SidebarActionButton
          label="Video Training Library Info"
          icon="🎬"
          onClick={() => {
            startFreshTopic("Video Training Library", "Video Training Library Info");
          }}
        />
        <SidebarExternalLink
          label="YouTube Training Videos"
          href="https://www.youtube.com/c/CIBNTVCIBNConnectWithBusinessOwners"
          icon="▶"
        />

        <SidebarSection title="Member Access" />
        <SidebarExternalLink
          label="Member Login"
          href="https://cibnconnect.com"
          icon="🔐"
        />
      </div>
    </div>
  );

  const InputBar = (
    <form
      onSubmit={handleSubmit}
      style={{
        borderTop: "1px solid rgb(229,231,235)",
        padding: "14px 18px 16px",
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(10px)",
        flexShrink: 0,
      }}
    >
      {error && (
        <div
          style={{
            marginBottom: 8,
            color: "rgb(185,28,28)",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 12,
          padding: "10px",
          borderRadius: 18,
          background: "rgb(248,250,252)",
          border: "1px solid rgb(229,231,235)",
          boxShadow: "0 4px 12px rgba(15,29,77,0.05)",
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a question or use the mic..."
          style={{
            flex: 1,
            minWidth: 0,
            border: "1px solid rgb(209,213,219)",
            borderRadius: 999,
            padding: "13px 16px",
            fontSize: 16,
            outline: "none",
            background: "rgb(255,255,255)",
          }}
        />

        <button
          type="button"
          onClick={handleMicClick}
          disabled={isLoading && !isRecording}
          title={isRecording ? "Stop recording" : "Use microphone"}
          style={{
            background: isRecording
              ? "linear-gradient(135deg, rgb(239,68,68) 0%, rgb(220,38,38) 100%)"
              : "linear-gradient(135deg, rgb(240,193,77) 0%, rgb(219,169,40) 100%)",
            color: "rgb(255,255,255)",
            border: "none",
            borderRadius: 999,
            width: 48,
            height: 48,
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isLoading && !isRecording ? "default" : "pointer",
            opacity: isLoading && !isRecording ? 0.7 : 1,
            flexShrink: 0,
            boxShadow: isRecording
              ? "0 0 0 5px rgba(239,68,68,0.15)"
              : "0 0 0 5px rgba(240,193,77,0.15)",
          }}
        >
          <MicIcon active />
        </button>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            background:
              "linear-gradient(135deg, rgb(15,29,77) 0%, rgb(22,42,102) 100%)",
            color: "rgb(255,255,255)",
            border: "none",
            borderRadius: 999,
            padding: "13px 20px",
            fontSize: 15,
            fontWeight: 700,
            cursor: isLoading ? "default" : "pointer",
            opacity: isLoading ? 0.7 : 1,
            flexShrink: 0,
          }}
        >
          Send
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            setInput("");
            void sendMessage("Back");
          }}
          style={bottomButtonStyle}
        >
          Back
        </button>

        <button type="button" onClick={goToMainMenu} style={bottomButtonStyle}>
          Main Menu
        </button>

        <button
          type="button"
          onClick={() => {
            setInput("");
            void sendMessage("Dig Deeper");
          }}
          style={bottomButtonStyle}
        >
          Dig Deeper
        </button>

        <button
          type="button"
          onClick={stopCurrentAudio}
          style={{
            ...bottomButtonStyle,
            color: "rgb(185,28,28)",
            borderColor: "rgb(252,165,165)",
          }}
        >
          Stop Audio
        </button>
      </div>
    </form>
  );

  return (
    <main
      style={{
        height: "100vh",
        background:
          "linear-gradient(180deg, rgb(238,243,249) 0%, rgb(248,250,252) 100%)",
        color: "rgb(15,29,77)",
        display: "flex",
        flexDirection: "column",
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        overflow: "hidden",
      }}
    >
      <header
        style={{
          background:
            "linear-gradient(135deg, rgb(15,29,77) 0%, rgb(22,42,102) 100%)",
          color: "rgb(255,255,255)",
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 4px 16px rgba(15,29,77,0.18)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mobile-menu-btn"
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "none",
              borderRadius: 6,
              padding: "6px 10px",
              color: "white",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ☰
          </button>

          <img
            src="/cibn-logo.png"
            alt="CIBN logo"
            style={{
              height: 46,
              width: "auto",
              display: "block",
              objectFit: "contain",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.14))",
            }}
          />

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                lineHeight: 1.1,
                fontWeight: 700,
                color: "rgb(255,255,255)",
                letterSpacing: "-0.3px",
              }}
            >
              CIBN Connect Hub
            </h1>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 14,
                fontWeight: 400,
                color: "rgba(255,255,255,0.85)",
              }}
            >
              Guided by Kerry George
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <a
            href="https://cibnconnect.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...headerActionBase,
              background: "rgba(255,255,255,0.15)",
              color: "rgb(255,255,255)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            Member Login
          </a>

          <a
            href="https://api.leadconnectorhq.com/widget/groups/bookcibn"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...headerActionBase,
              background:
                "linear-gradient(135deg, rgb(34,197,94) 0%, rgb(22,163,74) 100%)",
              color: "rgb(255,255,255)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            Book a Tour
          </a>

          <a
            href="https://cibnconnect.com/membership-options"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...headerActionBase,
              background: "rgb(255,255,255)",
              color: "rgb(15,29,77)",
              border: "1px solid rgba(15,29,77,0.1)",
            }}
          >
            Become a Member
          </a>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="mobile-overlay"
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 10,
            }}
          />
        )}

        <div className="desktop-sidebar">{SidebarContent}</div>

        {sidebarOpen && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 20,
              width: 260,
            }}
            className="mobile-sidebar-drawer"
          >
            {SidebarContent}
          </div>
        )}

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid rgb(229,231,235)",
              background: "rgb(255,255,255)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "rgb(17,24,39)" }}>
              {stage === "welcome" ? "Welcome" : activeTopicLabel ?? "CIBN Conversation"}
            </div>
            <SparkIndicator state={voiceStatus} />
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: "20px",
              background: "rgb(248,250,252)",
            }}
          >
            {stage === "welcome" && (
              <div
                style={{
                  maxWidth: "820px",
                  background: "rgb(255,255,255)",
                  border: "1px solid rgb(229,231,235)",
                  borderRadius: 22,
                  padding: "30px 32px 34px",
                  boxShadow: "0 12px 32px rgba(15,29,77,0.08)",
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 23,
                    fontWeight: 700,
                    color: "rgb(17,24,39)",
                    marginBottom: 16,
                  }}
                >
                  Welcome — I&apos;m Kerry George, and I&apos;m glad you&apos;re here.
                </div>

                <div
                  style={{
                    fontSize: 17,
                    lineHeight: 1.78,
                    color: "rgb(51,65,85)",
                    marginBottom: 14,
                  }}
                >
                  CIBN stands for <strong>Collaborative International Business Network</strong>.
                  It helps entrepreneurs, professionals, and business owners build trusted
                  relationships, collaborating partnerships, warmed-up referrals, and revenue
                  in a more intentional way.
                </div>

                <div
                  style={{
                    fontSize: 17,
                    lineHeight: 1.78,
                    color: "rgb(51,65,85)",
                    marginBottom: 24,
                  }}
                >
                  Choose a topic from the sidebar, click a menu option, or type a question in
                  the question box at the bottom of this page.
                </div>

                <div
                  style={{
                    background: "rgb(248,250,252)",
                    border: "1px solid rgb(229,231,235)",
                    borderRadius: 14,
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "rgb(17,24,39)",
                      marginBottom: 14,
                    }}
                  >
                    Here&apos;s how to get started:
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 14,
                      fontSize: 18,
                      color: "rgb(71,85,99)",
                      lineHeight: 1.75,
                    }}
                  >
                    {[
                      {
                        n: "①",
                        t: (
                          <span>
                            Choose <strong>Explore CIBN</strong> to learn what CIBN is, see if it is a good fit, or review membership options.
                          </span>
                        ),
                      },
                      {
                        n: "②",
                        t: (
                          <span>
                            Inside <strong>Explore CIBN</strong>, use the submenus for <strong>What is CIBN?</strong>, <strong>Good Fit</strong>, and <strong>Membership Options</strong>.
                          </span>
                        ),
                      },
                      {
                        n: "③",
                        t: (
                          <span>
                            The <strong>CIBN Fit Quiz</strong> and <strong>Membership Quiz</strong> run one question at a time with clickable answers.
                          </span>
                        ),
                      },
                      {
                        n: "④",
                        t: (
                          <span>
                            Type any question in the <strong>question box at the bottom</strong> and press Send.
                          </span>
                        ),
                      },
                      {
                        n: "⑤",
                        t: (
                          <span>
                            Use <strong>Member Events Info</strong> and <strong>Video Training Library Info</strong> in the sidebar to view public information without needing member login.
                          </span>
                        ),
                      },
                    ].map(({ n, t }) => (
                      <div
                        key={n}
                        style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                      >
                        <span
                          style={{
                            color: "rgb(15,29,77)",
                            fontWeight: 700,
                            flexShrink: 0,
                            fontSize: 18,
                            lineHeight: 1.75,
                          }}
                        >
                          {n}
                        </span>
                        <span style={{ fontSize: 18, lineHeight: 1.75 }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {visibleMessages.length === 0 && stage === "chat" && (
              <div
                style={{
                  background: "rgb(255,255,255)",
                  border: "1px solid rgb(229,231,235)",
                  borderRadius: 18,
                  padding: 22,
                  fontSize: 19,
                  lineHeight: 1.8,
                  color: "rgb(0,0,0)",
                  marginBottom: 14,
                }}
              >
                Choose a topic from the sidebar or ask a question below.
              </div>
            )}

            {visibleMessages.map((message, msgIndex) => {
              const isLastAssistant =
                message.role === "assistant" && msgIndex === visibleMessages.length - 1;

              const menuItems =
                message.role === "assistant" ? parseMenuItems(message.content) : [];

              const showButtons = isLastAssistant && menuItems.length > 0 && !isLoading;
              const displayContent = showButtons
                ? stripListLines(message.content)
                : message.content;
              const isLatest = msgIndex === visibleMessages.length - 1;

              return (
                <div
                  key={`msg-${msgIndex}`}
                  ref={isLatest ? latestMessageRef : null}
                  style={{
                    marginBottom: 16,
                    display: "flex",
                    justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div style={{ maxWidth: "880px", width: "100%" }}>
                    <div
                      style={{
                        width: message.role === "assistant" ? "100%" : "auto",
                        marginLeft: message.role === "assistant" ? 0 : "auto",
                        background:
                          message.role === "assistant"
                            ? "rgb(255,255,255)"
                            : "linear-gradient(135deg, rgb(15,29,77) 0%, rgb(22,42,102) 100%)",
                        color: message.role === "assistant" ? "rgb(0,0,0)" : undefined,
                        border:
                          message.role === "assistant"
                            ? "1px solid rgb(229,231,235)"
                            : "none",
                        borderRadius: 20,
                        padding: "22px 26px",
                        boxShadow:
                          message.role === "assistant"
                            ? "0 4px 14px rgba(15,29,77,0.05)"
                            : "0 8px 20px rgba(15,29,77,0.18)",
                        lineHeight: 1.85,
                        fontSize: 19,
                      }}
                    >
                      {message.role === "assistant" ? (
                        renderFormattedMessage(displayContent)
                      ) : (
                        <span
                          style={{
                            color: "rgb(255,255,255)",
                            fontWeight: 500,
                            fontSize: 17,
                          }}
                        >
                          {message.content}
                        </span>
                      )}
                    </div>

                    {showButtons && (
                      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                        {menuItems.map((item, btnIndex) => (
                          <button
                            key={`btn-${msgIndex}-${btnIndex}-${item.key}`}
                            type="button"
                            onClick={() => void sendMessage(item.key)}
                            style={menuItemButtonStyle}
                          >
                            <span
                              style={{
                                background: "rgb(15,29,77)",
                                color: "white",
                                borderRadius: 6,
                                padding: "3px 10px",
                                fontSize: 15,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {item.key}
                            </span>
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {message.role === "assistant" && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => void playAssistantMessage(message.content, msgIndex)}
                          style={smallActionButton}
                        >
                          {audioLoadingIndex === msgIndex ? "Loading..." : "▶ Play Audio"}
                        </button>

                        {voiceStatus === "speaking" && audioLoadingIndex === null && (
                          <button
                            type="button"
                            onClick={stopCurrentAudio}
                            style={{
                              ...smallActionButton,
                              color: "rgb(185,28,28)",
                              borderColor: "rgb(252,165,165)",
                            }}
                          >
                            ■ Stop Audio
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    background: "rgb(255,255,255)",
                    border: "1px solid rgb(229,231,235)",
                    borderRadius: 18,
                    padding: "16px 22px",
                    display: "inline-block",
                  }}
                >
                  <ThinkingMessages />
                </div>
              </div>
            )}
          </div>

          {InputBar}
        </div>
      </div>

      <style jsx global>{`
        .mobile-menu-btn {
          display: none !important;
        }
        .desktop-sidebar {
          display: flex !important;
          flex-shrink: 0;
        }
        .mobile-overlay {
          display: none !important;
        }
        .mobile-sidebar-drawer {
          display: none !important;
        }
        @media (max-width: 640px) {
          .mobile-menu-btn {
            display: block !important;
          }
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-overlay {
            display: block !important;
          }
          .mobile-sidebar-drawer {
            display: block !important;
          }
        }
      `}</style>
    </main>
  );
}