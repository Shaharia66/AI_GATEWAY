import { useState } from "react";
import ChatPage from "./ChatPage.jsx";
import DashboardPage from "./DashboardPage.jsx";

const TABS = [
  { id: "chat", label: "Chat" },
  { id: "dashboard", label: "Dashboard" },
];

export default function App() {
  const [tab, setTab] = useState("chat");

  return (
    <div style={{ background: "#0B1220", minHeight: "100vh" }}>
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "12px 24px 0",
          borderBottom: "1px solid #223049",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: tab === t.id ? "2px solid #45D9C0" : "2px solid transparent",
              color: tab === t.id ? "#E7ECF5" : "#7E8AA3",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "chat" ? <ChatPage /> : <DashboardPage />}
    </div>
  );
}