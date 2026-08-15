import { useState, useRef, useEffect } from "react";

const PROVIDER_COLORS = {
  groq: "#45D9C0",
  mistral: "#F5A85E",
  google: "#6FA8F5",
  cerebras: "#B58AF5",
  openai: "#F17B72",
};

function providerColor(name) {
  return PROVIDER_COLORS[name] || "#7E8AA3";
}

function formatCost(usd) {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(6)}`;
  return `$${usd.toFixed(2)}`;
}

function Badge({ text, color }) {
  return (
    <span
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        background: `${color}22`,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export default function ChatPage() {
  const [baseUrl, setBaseUrl] = useState(
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
  );
  const [apiKey, setApiKey] = useState(
    import.meta.env.VITE_GATEWAY_API_KEY || "dev-key-123"
  );
  const [provider, setProvider] = useState("");
  const [taskType, setTaskType] = useState("chat");
  const [useCache, setUseCache] = useState(true);
  const [strict, setStrict] = useState(false);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const body = {
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        task_type: taskType,
        use_cache: useCache,
        strict,
      };
      if (provider) body.provider = provider;

      const res = await fetch(`${baseUrl}/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        const detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
        throw new Error(detail || `Request failed (${res.status})`);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content,
          meta: {
            provider: data.provider,
            model: data.model,
            cacheHit: data.cache_hit,
            fallbackUsed: data.fallback_used,
            providersTried: data.providers_tried,
            totalTokens: data.total_tokens,
            cost: data.estimated_cost_usd,
          },
        },
      ]);
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const selectStyle = {
    background: "#121B2E",
    border: "1px solid #223049",
    borderRadius: 6,
    color: "#E7ECF5",
    fontSize: 12,
    fontFamily: "ui-monospace, monospace",
    padding: "6px 8px",
  };

  return (
    <div
      style={{
        background: "#0B1220",
        minHeight: "100%",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: 12,
            color: "#45D9C0",
            letterSpacing: "0.1em",
            marginBottom: 4,
          }}
        >
          AI GATEWAY
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#E7ECF5", margin: 0 }}>Chat</h1>
      </div>

      {/* Connection + routing controls */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 16,
          background: "#121B2E",
          border: "1px solid #223049",
          borderRadius: 10,
          padding: "10px 12px",
        }}
      >
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="http://localhost:8000"
          style={{ ...selectStyle, width: 170 }}
        />
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="gateway api key"
          style={{ ...selectStyle, width: 120 }}
        />
        <select value={provider} onChange={(e) => setProvider(e.target.value)} style={selectStyle}>
          <option value="">auto-route</option>
          <option value="groq">groq</option>
          <option value="mistral">mistral</option>
          <option value="google">google</option>
          <option value="cerebras">cerebras</option>
          <option value="openai">openai</option>
        </select>
        <select value={taskType} onChange={(e) => setTaskType(e.target.value)} style={selectStyle}>
          <option value="chat">chat</option>
          <option value="code">code</option>
          <option value="fast">fast</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#7E8AA3" }}>
          <input type="checkbox" checked={useCache} onChange={(e) => setUseCache(e.target.checked)} />
          cache
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#7E8AA3" }}>
          <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} />
          strict
        </label>
      </div>

      {/* Message list */}
      <div
        style={{
          flex: 1,
          background: "#121B2E",
          border: "1px solid #223049",
          borderRadius: 10,
          padding: "16px",
          minHeight: 320,
          maxHeight: 480,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          marginBottom: 12,
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: "#5A6478", fontSize: 13, margin: "auto" }}>
            Send a message to try the gateway. Pick a provider above to force a specific one, or
            leave it on auto-route.
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} style={{ alignSelf: "flex-end", maxWidth: "75%" }}>
              <div
                style={{
                  background: "#1B2A45",
                  color: "#E7ECF5",
                  borderRadius: "10px 10px 2px 10px",
                  padding: "10px 14px",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} style={{ alignSelf: "flex-start", maxWidth: "75%" }}>
              <div
                style={{
                  background: "#182238",
                  color: "#E7ECF5",
                  borderRadius: "10px 10px 10px 2px",
                  padding: "10px 14px",
                  fontSize: 14,
                  lineHeight: 1.5,
                  borderLeft: `3px solid ${providerColor(m.meta?.provider)}`,
                }}
              >
                {m.content}
              </div>
              {m.meta && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 6,
                    flexWrap: "wrap",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 11,
                    color: "#5A6478",
                  }}
                >
                  <span style={{ color: providerColor(m.meta.provider), fontWeight: 600 }}>
                    {m.meta.provider}
                  </span>
                  <span>{m.meta.model}</span>
                  <span>{m.meta.totalTokens} tok</span>
                  <span>{formatCost(m.meta.cost)}</span>
                  {m.meta.cacheHit && <Badge text="cached" color="#6FCE8F" />}
                  {m.meta.fallbackUsed && (
                    <Badge text={`fallback via ${m.meta.providersTried?.join(" → ")}`} color="#F5A85E" />
                  )}
                </div>
              )}
            </div>
          )
        )}

        {sending && (
          <div style={{ alignSelf: "flex-start", color: "#5A6478", fontSize: 13 }}>
            thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div
          style={{
            background: "#2A1414",
            border: "1px solid #F17B72",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 12,
            color: "#F5B8B4",
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {error}
        </div>
      )}

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask something… (Enter to send, Shift+Enter for new line)"
          rows={2}
          style={{
            flex: 1,
            background: "#121B2E",
            border: "1px solid #223049",
            borderRadius: 8,
            color: "#E7ECF5",
            fontSize: 14,
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: "10px 12px",
            resize: "none",
          }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          style={{
            background: sending || !input.trim() ? "#1B2A45" : "#45D9C0",
            color: sending || !input.trim() ? "#5A6478" : "#04342C",
            border: "none",
            borderRadius: 8,
            padding: "0 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: sending || !input.trim() ? "default" : "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}