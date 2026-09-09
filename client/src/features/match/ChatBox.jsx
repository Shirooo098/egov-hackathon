import "../../styles/components/match/ChatBox.css";
import React, { useState, useRef, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { maskedName } from "../../utils/maskedName";
import { eMessageToast } from "../../utils/eMessageToast";

const DEMO_MESSAGES = [
  {
    id: 1,
    sender: "donor",
    text: "Good day! I reviewed the sample donation agreement for this demo.",
    time: "10:30 AM",
  },
  {
    id: 2,
    sender: "recipient",
    text: "Thank you. I reviewed the sample agreement too.",
    time: "10:32 AM",
  },
  {
    id: 3,
    sender: "donor",
    text: "I will see you at Philippine General Hospital (PGH) if we confirm the demonstrated schedule.",
    time: "10:33 AM",
  },
];

export default function ChatBox({
  currentRole = "recipient",
  consentSigned = false,
  hospitalApproved = false,
}) {
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [text, setText] = useState("");
  const endRef = useRef();
  const toast = useToast();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!text.trim() || !hospitalApproved) return;
    const newText = text.trim();
    setMessages((p) => [
      ...p,
      {
        id: Date.now(),
        sender: currentRole,
        text: newText,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setText("");

    // Demonstrate a simulated notification without blocking the conversation.
    eMessageToast(toast, "chat_message", { other });
  };

  // Reaching agreement submission removes all legacy anonymous name masking (Issue #010)
  const other = consentSigned
    ? currentRole === "donor"
      ? "Ana Reyes"
      : "Juan Dela Cruz"
    : maskedName(currentRole === "donor" ? "recipient" : "donor");

  // STRICT LOCK SCREEN: Prohibit chat unless approved by institutional clinical review
  if (!hospitalApproved) {
    return (
      <div className="card anim-in chat-box chat-box--locked">
        <div className="chat-box-lock-icon">🔒</div>
        <div>
          <h3 className="chat-box-lock-title">
            Chat will open after the hospital demo review
          </h3>
          <p className="chat-box-lock-copy">
            Chat opens after the hospital review step in this demo. A hospital
            administrator review is not a doctor’s clinical clearance.
          </p>
        </div>

        <div className="chat-box-lock-status">
          <span className="chat-box-status-dot" />
          <span className="chat-box-status-label">
            Waiting for hospital review
          </span>
        </div>
      </div>
    );
  }

  // ACTIVE UNLOCKED CHAT ROOM
  return (
    <div className="card anim-in chat-box">
      {/* Header */}
      <div className="chat-box-header">
        <div className="chat-box-avatar">{other.charAt(0)}</div>
        <div className="chat-box-partner">
          <div className="chat-box-partner-name">
            {other}
            {!consentSigned && (
              <span className="badge badge-warning chat-box-masked-badge">
                Masked ID (Complete Agreement to Unmask)
              </span>
            )}
          </div>
          <div className="chat-box-meta">
            <span className="chat-box-online-dot" />
            Demo conversation ·{" "}
            {consentSigned
              ? "Identity details shown after agreement step"
              : "Names remain masked"}
          </div>
        </div>
        {consentSigned ? (
          <span className="badge badge-verified chat-box-identity-badge">
            Demo identity details shown
          </span>
        ) : (
          <span className="badge chat-box-anonymous-badge">
            Anonymous Communication
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        className="chat-box-messages"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((m) => {
          const self = m.sender === currentRole;
          return (
            <div
              className="chat-box-message"
              key={m.id}
              style={{ alignItems: self ? "flex-end" : "flex-start" }}
            >
              <div
                className={`chat-box-bubble bubble ${self ? "bubble-sent" : "bubble-recv"}`}
                aria-label={self ? "You" : other}
              >
                {m.text}
              </div>
              <span className="chat-box-time">{m.time}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="chat-box-input-row">
        <textarea
          className="input chat-box-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a demo message… (Enter to send)"
          rows={1}
          aria-label="Message input"
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="btn btn-primary btn-icon chat-box-send"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
