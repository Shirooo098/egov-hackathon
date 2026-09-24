import { useState, useRef, useEffect } from "react";
import { egovApi } from "../../services/egovApi";
type Message = {
  id: string | number;
  sender: "ai" | "user";
  text: string;
  time: string;
};

const GREETING = {
  id: "greeting",
  sender: "ai",
  text: "Welcome to eGovAI guidance. This assistant provides public process information only and cannot provide clinical, legal, eligibility, matching, or scheduling decisions. The official service is currently deferred pending contract verification.",
  time: "",
};

export const PUBLIC_EGOVAI_CHOICES = [
  "How does eBuhay coordination work?",
  "What are the steps to become a donor?",
  "What are the steps to become a recipient?",
  "How can I contact the coordination team?",
] as const;

export default function FloatingAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING as Message]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLButtonElement>(null);
  const closeChat = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, open]);

  const timeNow = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const send = async (prompt: string) => {
    if (loading) return;

    setMessages((p) => [
      ...p,
      { id: Date.now(), sender: "user", text: prompt, time: timeNow() },
    ]);
    setLoading(true);

    try {
      const res = await egovApi.askAI(prompt, "PH");
      setMessages((p) => [
        ...p,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: String(res.data),
          time: timeNow(),
        },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: "The official eGovAI service is currently unavailable or deferred (503). Please retry later after official integration is verified.",
          time: timeNow(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="floating-ai-root">
      {open && (
        <div
          id="floating-ai-panel"
          className="floating-ai-panel card anim-in"
          role="dialog"
          aria-modal="false"
          aria-labelledby="floating-ai-chat-title"
        >
          {/* Header */}
          <div className="floating-ai-header">
            <div className="floating-ai-avatar">e</div>
            <div className="floating-ai-title-wrap">
              <h2 id="floating-ai-chat-title" className="floating-ai-title">
                eGovAI Guidance
              </h2>
              <div className="floating-ai-status">
                <span
                  className="floating-ai-status-dot"
                  style={{ backgroundColor: "var(--danger, #DC2626)" }}
                />
                Service unavailable (503)
              </div>
            </div>
            <button
              onClick={closeChat}
              aria-label="Close chat"
              className="btn btn-ghost btn-icon floating-ai-close"
            >
              ✕
            </button>
          </div>

          <div
            className="floating-ai-disclaimer"
            style={{
              padding: "0.5rem 0.75rem",
              fontSize: "0.75rem",
              background: "var(--surface-muted, #f1f5f9)",
              borderBottom: "1px solid var(--border, #e2e8f0)",
              color: "var(--foreground-muted, #64748b)",
            }}
          >
            <strong>Informational guidance only:</strong> Public process questions
            only. Excludes clinical, legal, eligibility, matching, or scheduling
            advice.
          </div>

          {/* Messages */}
          <div
            role="log"
            aria-live="polite"
            aria-label="AI chat messages"
            className="floating-ai-messages"
          >
            {messages.map((m) => {
              const self = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`floating-ai-message ${self ? "floating-ai-message-self" : ""}`}
                >
                  <div
                    className={`bubble ${self ? "bubble-sent" : "bubble-recv"} floating-ai-bubble`}
                  >
                    {m.text}
                  </div>
                  {m.time && <span className="floating-ai-time">{m.time}</span>}
                </div>
              );
            })}
            {loading && (
              <div className="floating-ai-thinking">
                <div className="bubble bubble-recv">
                  <span className="spinner floating-ai-spinner" />
                  Thinking…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="floating-ai-input">
            <div className="floating-ai-choice-list" role="group" aria-label="Public eBuhay process questions">
              {PUBLIC_EGOVAI_CHOICES.map((choice, index) => (
                <button
                  key={choice}
                  ref={index === 0 ? inputRef : undefined}
                  onClick={() => void send(choice)}
                  disabled={loading}
                  className="btn btn-secondary floating-ai-choice"
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        ref={launcherRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        aria-expanded={open}
        aria-controls="floating-ai-panel"
        aria-haspopup="dialog"
        className="floating-ai-launcher"
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
