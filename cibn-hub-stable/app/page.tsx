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
            color: "rgb(29, 78, 216)",
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
                fontSize: 21,
                color: "rgb(0, 0, 0)",
                marginTop: 14,
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
                paddingLeft: 26,
                marginBottom: 8,
                lineHeight: 1.75,
                fontSize: 18,
                color: "rgb(0, 0, 0)",
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
              marginBottom: 10,
              lineHeight: 1.8,
              fontSize: 18,
              color: "rgb(0, 0, 0)",
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
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const visibleMessages = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        content: cleanMessage(message.content),
      })),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  function startExperience() {
    setStage("menu");
  }

  function chooseMainMenu(value: string) {
    void sendMessage(value);
  }

  const headerActionBase: React.CSSProperties = {
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
  };

  const bottomButtonStyle: React.CSSProperties = {
    background: "rgb(255, 255, 255)",
    color: "rgb(15, 29, 77)",
    border: "1px solid rgb(209, 213, 219)",
    borderRadius: 999,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(15,29,77,0.08)",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, rgb(238,243,249) 0%, rgb(248,250,252) 100%)",
        color: "rgb(15, 29, 77)",
        display: "flex",
        flexDirection: "column",
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}
    >
      <header
        style={{
          background: "linear-gradient(135deg, rgb(15,29,77) 0%, rgb(22,42,102) 100%)",
          color: "rgb(255, 255, 255)",
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
                  color: "rgb(255, 255, 255)",
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
                background: "linear-gradient(135deg, rgb(34,197,94) 0%, rgb(22,163,74) 100%)",
                color: "rgb(255, 255, 255)",
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
                background: "rgb(255, 255, 255)",
                color: "rgb(15, 29, 77)",
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
                background: "linear-gradient(135deg, rgb(37,99,235) 0%, rgb(29,78,216) 100%)",
                color: "rgb(255, 255, 255)",
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
              background: "rgb(255, 255, 255)",
              border: "1px solid rgb(229, 231, 235)",
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
                borderBottom: "1px solid rgb(229, 231, 235)",
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
                    color: "rgb(17, 24, 39)",
                    marginBottom: 6,
                  }}
                >
                  Welcome — I’m Kerry George, and I’m glad you’re here.
                </div>

                <div
                  style={{
                    fontSize: 16,
                    color: "rgb(75, 85, 99)",
                    lineHeight: 1.6,
                    fontWeight: 400,
                    maxWidth: 850,
                  }}
                >
                  CIBN Connect helps entrepreneurs, professionals, and business owners
                  build trusted relationships, collaborating partnerships, warmed-up
                  referrals, and revenue in a more intentional way.
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 17,
                lineHeight: 1.75,
                fontWeight: 400,
                color: "rgb(51, 65, 85)",
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
                color: "rgb(51, 65, 85)",
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
                background: "rgb(248, 250, 252)",
                border: "1px solid rgb(229, 231, 235)",
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
                  color: "rgb(17, 24, 39)",
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
                  color: "rgb(51, 65, 85)",
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
                background: "linear-gradient(135deg, rgb(240,193,77) 0%, rgb(219,169,40) 100%)",
                color: "rgb(15, 29, 77)",
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
              background: "rgb(255, 255, 255)",
              border: "1px solid rgb(229, 231, 235)",
              borderRadius: 28,
              padding: "32px 32px 34px",
              boxShadow: "0 18px 42px rgba(15,29,77,0.09)",
            }}
          >
            <div
              style={{
                fontSize: 25,
                fontWeight: 700,
                color: "rgb(17, 24, 39)",
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
                    background: "rgb(255, 255, 255)",
                    padding: "22px",
                    borderRadius: 16,
                    border: "1px solid rgb(229, 231, 235)",
                    cursor: "pointer",
                    boxShadow: "0 6px 18px rgba(15,29,77,0.05)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "rgb(17, 24, 39)",
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
                      color: "rgb(85, 85, 85)",
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
              background: "rgb(255, 255, 255)",
              borderRadius: 24,
              border: "1px solid rgb(229, 231, 235)",
              boxShadow: "0 18px 42px rgba(15,29,77,0.09)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgb(229, 231, 235)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                background: "rgb(255, 255, 255)",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "rgb(17, 24, 39)",
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
                background: "rgb(248, 250, 252)",
              }}
            >
              {visibleMessages.length === 0 && (
                <div
                  style={{
                    background: "rgb(255, 255, 255)",
                    border: "1px solid rgb(229, 231, 235)",
                    borderRadius: 18,
                    padding: 22,
                    fontSize: 19,
                    lineHeight: 1.85,
                    fontWeight: 400,
                    color: "rgb(0, 0, 0)",
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
                          ? "rgb(255, 255, 255)"
                          : "linear-gradient(135deg, rgb(15,29,77) 0%, rgb(22,42,102) 100%)",
                      color: message.role === "assistant" ? "rgb(0,0,0)" : undefined,
                      border:
                        message.role === "assistant"
                          ? "1px solid rgb(229, 231, 235)"
                          : "none",
                      borderRadius: 20,
                      padding: "22px 26px",
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
                            color: "rgb(255,255,255)",
                            WebkitTextFillColor: "rgb(255,255,255)",
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
                    background: "rgb(255, 255, 255)",
                    border: "1px solid rgb(229, 231, 235)",
                    borderRadius: 18,
                    padding: "16px 18px",
                    color: "rgb(0, 0, 0)",
                    fontSize: 19,
                    lineHeight: 1.85,
                    fontWeight: 400,
                    boxShadow: "0 4px 12px rgba(15,29,77,0.04)",
                  }}
                >
                  Thinking…
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                borderTop: "1px solid rgb(229, 231, 235)",
                padding: "16px 18px 18px",
                background: "rgb(255, 255, 255)",
              }}
            >
              {error && (
                <div
                  style={{
                    marginBottom: 10,
                    color: "rgb(185, 28, 28)",
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
                    border: "1px solid rgb(209, 213, 219)",
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
                    background: "linear-gradient(135deg, rgb(15,29,77) 0%, rgb(22,42,102) 100%)",
                    color: "rgb(255, 255, 255)",
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
                  onClick={() => {
                    setInput("");
                    void sendMessage("Back");
                  }}
                  style={bottomButtonStyle}
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInput("");
                    void sendMessage("Main Menu");
                  }}
                  style={bottomButtonStyle}
                >
                  Main Menu
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInput("");
                    void sendMessage("Dig Deeper");
                  }}
                  style={{
                    ...bottomButtonStyle,
                    background: "rgb(248, 250, 252)",
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