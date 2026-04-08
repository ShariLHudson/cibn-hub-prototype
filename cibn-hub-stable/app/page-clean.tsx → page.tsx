"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type MenuOption = {
  label: string;
  value: string;
  description: string;
};

const MAIN_MENU_OPTIONS: MenuOption[] = [
  {
    label: "1. Explore CIBN",
    value: "1",
    description: "Learn what CIBN is and see whether it fits.",
  },
  {
    label: "2. I’m a Member",
    value: "2",
    description: "Get support, structure, and next steps.",
  },
  {
    label: "3. Tools & Training",
    value: "3",
    description: "Explore tools, training, and videos.",
  },
];

function cleanMessage(text: string): string {
  return text.replace(/\[\[CTX:[^\]]+\]\]/g, "").trim();
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
            color: "#0f1d4d",
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
      return (
        <strong key={index} style={{ fontWeight: 700 }}>
          {part.replace(/\*\*/g, "")}
        </strong>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function renderFormattedMessage(content: string): ReactNode {
  const lines = content.split("\n");

  return (
    <div>
      {lines.map((rawLine, index) => {
        const trimmed = rawLine.trim();

        if (!trimmed) {
          return <div key={index} style={{ height: 10 }} />;
        }

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
                fontSize: 20,
                color: "#000000",
                marginTop: 8,
                marginBottom: 8,
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
                textIndent: -14,
                marginBottom: 8,
                color: "#000000",
                fontWeight: 400,
                lineHeight: 1.85,
                fontSize: 19,
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
              marginBottom: 8,
              color: "#000000",
              fontWeight: 400,
              lineHeight: 1.85,
              fontSize: 19,
            }}
          >
            {renderInlineContent(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

export default function Page() {
  const [stage, setStage] = useState<"welcome" | "menu" | "chat">("welcome");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const visibleMessages = useMemo(
    () =>
      messages.map((m) => ({
        ...m,
        content: cleanMessage(m.content),
      })),
    [messages]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [visibleMessages, isLoading]);

  async function sendMessage(rawValue: string) {
    const value = rawValue.trim();
    if (!value || isLoading) return;

    setError("");
    const nextHistory: Message[] = [...messages, { role: "user", content: value }];
    setMessages(nextHistory);
    setInput("");
    setStage("chat");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: value,
          history: nextHistory,
        }),
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
          : "I’m sorry — I couldn’t load that response.";

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function startExperience() {
    setStage("menu");
  }

  function chooseMainMenu(value: string) {
    void sendMessage(value);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  const bottomButtonStyle = {
    background: "#ffffff",
    color: "#0f1d4d",
    border: "1px solid #d1d5db",
    borderRadius: 999,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(15,29,77,0.08)",
  } as const;

  const headerActionBase = {
    textDecoration: "none",
    borderRadius: 999,
    padding: "12px 18px",
    fontWeight: 700,
    fontSize: 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    boxShadow: "0 10px 22px rgba(15,29,77,0.14)",
    transition: "all 0.2s ease",
    letterSpacing: "0.1px",
  } as const;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #eef3f9 0%, #f8fafc 100%)",
        color: "#0f1d4d",
        display: "flex",
        flexDirection: "column",
        fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      }}
    >
      <header
        style={{
          background: "linear-gradient(135deg, #0f1d4d 0%, #162a66 100%)",
          color: "#ffffff",
          padding: "18px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 8px 24px rgba(15,29,77,0.18)",
        }}
      >
        <div
          style={{
            width: "68%",
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
            }}
          >
            <img
              src="/cibn-logo.png"
              alt="CIBN logo"
              style={{
                height: 54,
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
                  fontSize: 25,
                  lineHeight: 1.1,
                  fontWeight: 700,
                  color: "#ffffff",
                  letterSpacing: "-0.3px",
                }}
              >
                CIBN Connect Hub
              </h1>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 15,
                  lineHeight: 1.45,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                Guided by Kerry George
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <a
              href="https://api.leadconnectorhq.com/widget/groups/bookcibn"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...headerActionBase,
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.16)",
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
                background: "#ffffff",
                color: "#0f1d4d",
                border: "1px solid rgba(15,29,77,0.12)",
              }}
            >
              Become a Member
            </a>

            <a
              href="https://cibnconnect.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...headerActionBase,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
            >
              Member Login
            </a>
          </div>
        </div>
      </header>

      {stage === "welcome" && (
        <section
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "28px 24px",
          }}
        >
          <div
            style={{
              width: "68%",
              maxWidth: "1200px",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 28,
              padding: "34px 34px 36px",
              boxShadow: "0 18px 42px rgba(15,29,77,0.09)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 22,
                paddingBottom: 18,
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <img
                src="/kerry.jpg"
                alt="Kerry George"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  objectFit: "cover",
                  display: "block",
                  boxShadow: "0 8px 18px rgba(15,29,77,0.12)",
                }}
              />

              <div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: 6,
                  }}
                >
                  Welcome — I’m Kerry George, and I’m glad you’re here.
                </div>

                <div
                  style={{
                    fontSize: 16,
                    color: "#4b5563",
                    lineHeight: 1.6,
                    fontWeight: 400,
                    maxWidth: 850,
                  }}
                >
                  CIBN Connect helps entrepreneurs, professionals, and business
                  owners build trusted relationships, collaborating partnerships,
                  warmed-up referrals, and revenue in a more intentional way.
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 17,
                lineHeight: 1.75,
                fontWeight: 400,
                color: "#334155",
                marginBottom: 18,
                maxWidth: 920,
              }}
            >
              This hub is here to help you explore CIBN, understand how it works,
              and make better use of everything available inside the community.
            </div>

            <div
              style={{
                fontSize: 17,
                lineHeight: 1.75,
                fontWeight: 400,
                color: "#334155",
                marginBottom: 22,
                maxWidth: 920,
              }}
            >
              Whether you are exploring membership, just getting started, or
              already a member who wants to use CIBN more fully, this hub can help
              you find the next best step.
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                padding: "20px 22px",
                marginBottom: 26,
                maxWidth: 920,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 12,
                }}
              >
                Inside, you can:
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  fontSize: 17,
                  lineHeight: 1.7,
                  color: "#334155",
                }}
              >
                <div>• learn what CIBN is and how it works</div>
                <div>• explore membership options</div>
                <div>• get help as a member</div>
                <div>• find tools, training, videos, and next steps</div>
                <div>• dig deeper into specific topics as you go</div>
              </div>
            </div>

            <button
              type="button"
              onClick={startExperience}
              style={{
                background: "linear-gradient(135deg, #f0c14d 0%, #dba928 100%)",
                color: "#0f1d4d",
                border: "none",
                borderRadius: 999,
                padding: "15px 24px",
                fontSize: 18,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 12px 26px rgba(240,193,77,0.28)",
              }}
            >
              Start Here
            </button>
          </div>
        </section>
      )}

      {stage === "menu" && (
        <section
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "28px 24px",
          }}
        >
          <div
            style={{
              width: "68%",
              maxWidth: "1200px",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 28,
              padding: "32px 32px 34px",
              boxShadow: "0 18px 42px rgba(15,29,77,0.09)",
            }}
          >
            <div
              style={{
                fontSize: 25,
                fontWeight: 700,
                color: "#111827",
                marginBottom: 22,
              }}
            >
              Where would you like to start?
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {MAIN_MENU_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => chooseMainMenu(item.value)}
                  style={{
                    textAlign: "left",
                    background: "#ffffff",
                    padding: "22px",
                    borderRadius: 16,
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                    boxShadow: "0 6px 18px rgba(15,29,77,0.05)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: 8,
                    }}
                  >
                    {item.label}
                  </div>

                  <div
                    style={{
                      fontSize: 16,
                      lineHeight: 1.7,
                      fontWeight: 400,
                      color: "#555",
                    }}
                  >
                    {item.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {stage === "chat" && (
        <section
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            padding: "22px",
          }}
        >
          <div
            style={{
              width: "68%",
              maxWidth: "1200px",
              margin: "0 auto",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              background: "#ffffff",
              borderRadius: 24,
              border: "1px solid #e5e7eb",
              boxShadow: "0 18px 42px rgba(15,29,77,0.09)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                CIBN Conversation
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: "20px",
                background: "#f8fafc",
              }}
            >
              {visibleMessages.length === 0 && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 18,
                    padding: 22,
                    fontSize: 19,
                    lineHeight: 1.85,
                    fontWeight: 400,
                    color: "#000000",
                    marginBottom: 14,
                    boxShadow: "0 4px 12px rgba(15,29,77,0.04)",
                  }}
                >
                  Choose a menu option or ask a direct question to begin.
                </div>
              )}

              {visibleMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  style={{
                    marginBottom: 16,
                    display: "flex",
                    justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "900px",
                      width: message.role === "assistant" ? "100%" : "auto",
                      background:
                        message.role === "assistant"
                          ? "#ffffff"
                          : "linear-gradient(135deg, #0f1d4d 0%, #162a66 100%)",
                        color: message.role === "assistant" ? "#000000" : undefined,
                        WebkitTextFillColor:
                          message.role === "assistant" ? "#000000" : undefined,
                      border: message.role === "assistant" ? "1px solid #e5e7eb" : "none",
                      borderRadius: 18,
                      padding: "20px 24px",
                      boxShadow:
                        message.role === "assistant"
                          ? "0 6px 16px rgba(15,29,77,0.05)"
                          : "0 10px 20px rgba(15,29,77,0.18)",
                      whiteSpace: "normal",
                      lineHeight: 1.85,
                      fontSize: 19,
                      fontWeight: 400,
                    }}
                  >
                  {message.role === "assistant" ? (
                    renderFormattedMessage(message.content)
                  ) : (
                    <div
                      style={{
                        fontWeight: 500,
                        lineHeight: 1.6,
                        fontSize: 17,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <span
                        style={{
                          color: "#ffffff",
                          WebkitTextFillColor: "#ffffff",
                          textShadow: "0 0 0 #ffffff",
                        }}
                      >
                        {message.content}
                      </span>
                    </div>
                  )}
                  </div>
                </div>
              ))}
                            {isLoading && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 18,
                    padding: "16px 18px",
                    color: "#000000",
                    fontSize: 19,
                    lineHeight: 1.85,
                    fontWeight: 400,
                    boxShadow: "0 4px 12px rgba(15,29,77,0.04)",
                  }}
                >
                  Thinking…
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                borderTop: "1px solid #e5e7eb",
                padding: "16px 18px 18px",
                background: "#ffffff",
              }}
            >
              {error && (
                <div
                  style={{
                    marginBottom: 10,
                    color: "#b91c1c",
                    fontSize: 14,
                    lineHeight: 1.5,
                    fontWeight: 400,
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
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a question or choose a topic..."
                  style={{
                    flex: 1,
                    border: "1px solid #d1d5db",
                    borderRadius: 999,
                    padding: "14px 16px",
                    fontSize: 16,
                    fontWeight: 400,
                    outline: "none",
                    boxShadow: "inset 0 1px 2px rgba(15,29,77,0.04)",
                  }}
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    background: "linear-gradient(135deg, #0f1d4d 0%, #162a66 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 999,
                    padding: "14px 18px",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: isLoading ? "default" : "pointer",
                    opacity: isLoading ? 0.7 : 1,
                    boxShadow: "0 10px 20px rgba(15,29,77,0.18)",
                  }}
                >
                  Send
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => void sendMessage("Back")}
                  style={bottomButtonStyle}
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => void sendMessage("Main Menu")}
                  style={bottomButtonStyle}
                >
                  Main Menu
                </button>

                <button
                  type="button"
                  onClick={() => void sendMessage("Dig Deeper")}
                  style={{
                    ...bottomButtonStyle,
                    background: "#f8fafc",
                  }}
                >
                  Dig Deeper
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}