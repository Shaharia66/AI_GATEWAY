import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PROVIDER_COLORS = {
  groq: "#45D9C0",
  mistral: "#F5A85E",
  google: "#6FA8F5",
  cerebras: "#B58AF5",
  openai: "#F17B72",
};

const providerColor = (name) => PROVIDER_COLORS[name] || "#7E8AA3";

function formatCost(usd) {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(6)}`;
  return `$${usd.toFixed(2)}`;
}

function formatTime(unixSeconds) {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div
      style={{
        background: "#121B2E",
        border: "1px solid #223049",
        borderRadius: 10,
        padding: "16px 18px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 12,
          color: "#7E8AA3",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: 26,
          fontWeight: 600,
          color: accent || "#E7ECF5",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 12,
            color: "#5A6478",
            marginTop: 6,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
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
        color: color,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export default function DashboardPage() {
  const [baseUrl, setBaseUrl] = useState(
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
  );
  const [apiKey, setApiKey] = useState(
    import.meta.env.VITE_GATEWAY_API_KEY || "dev-key-123"
  );
  const [summary, setSummary] = useState([]);
  const [cacheStats, setCacheStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${apiKey}` };
      const [summaryRes, recentRes] = await Promise.all([
        fetch(`${baseUrl}/v1/usage`, { headers }),
        fetch(`${baseUrl}/v1/usage/recent?limit=15`, { headers }),
      ]);

      if (!summaryRes.ok || !recentRes.ok) {
        throw new Error(`Server responded with ${summaryRes.status}`);
      }

      const summaryData = await summaryRes.json();
      const recentData = await recentRes.json();

      setSummary(summaryData.summary || []);
      setCacheStats(summaryData.cache_stats || null);
      setRecent(recentData.requests || []);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || "Could not reach the gateway");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, apiKey]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 5000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  const totalRequests = summary.reduce((sum, p) => sum + p.request_count, 0);
  const totalCost = summary.reduce((sum, p) => sum + (p.total_cost_usd || 0), 0);
  const totalCacheHits = summary.reduce((sum, p) => sum + (p.cache_hits || 0), 0);
  const totalFallbacks = summary.reduce((sum, p) => sum + (p.fallback_count || 0), 0);
  const cacheHitRate = totalRequests > 0 ? Math.round((totalCacheHits / totalRequests) * 100) : 0;
  const fallbackRate = totalRequests > 0 ? Math.round((totalFallbacks / totalRequests) * 100) : 0;

  const chartData = summary.map((p) => ({ name: p.provider, requests: p.request_count }));

  return (
    <div
      style={{
        background: "#0B1220",
        minHeight: "100%",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "#E7ECF5", margin: 0 }}>
              Usage &amp; cost dashboard
            </h1>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: error ? "#F17B72" : "#6FCE8F",
              }}
            />
            <span style={{ fontSize: 12, color: "#5A6478" }}>
              {error ? "disconnected" : "live · every 5s"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:8000"
            style={{
              background: "#121B2E",
              border: "1px solid #223049",
              borderRadius: 6,
              color: "#E7ECF5",
              fontSize: 12,
              fontFamily: "ui-monospace, monospace",
              padding: "6px 10px",
              width: 190,
            }}
          />
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="gateway api key"
            style={{
              background: "#121B2E",
              border: "1px solid #223049",
              borderRadius: 6,
              color: "#E7ECF5",
              fontSize: 12,
              fontFamily: "ui-monospace, monospace",
              padding: "6px 10px",
              width: 140,
            }}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#2A1414",
            border: "1px solid #F17B72",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            color: "#F5B8B4",
            fontSize: 13,
          }}
        >
          Can't reach the gateway at <code>{baseUrl}</code>. Make sure <code>uvicorn</code> is
          running and CORS is enabled in <code>app/main.py</code>. ({error})
        </div>
      )}

      {/* Stat strip */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Total requests" value={loading ? "—" : totalRequests} accent="#45D9C0" />
        <StatCard
          label="Total cost"
          value={loading ? "—" : formatCost(totalCost)}
          sub="estimated"
          accent="#F5A85E"
        />
        <StatCard
          label="Cache hit rate"
          value={loading ? "—" : `${cacheHitRate}%`}
          sub={`${totalCacheHits} of ${totalRequests} served free`}
          accent="#6FCE8F"
        />
        <StatCard
          label="Fallback rate"
          value={loading ? "—" : `${fallbackRate}%`}
          sub={`${totalFallbacks} auto-recovered`}
          accent="#F17B72"
        />
      </div>

      {/* Chart + cache panel */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div
          style={{
            background: "#121B2E",
            border: "1px solid #223049",
            borderRadius: 10,
            padding: "16px 18px",
            flex: 2,
            minWidth: 280,
          }}
        >
          <div style={{ fontSize: 12, color: "#7E8AA3", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Requests by provider
          </div>
          {chartData.length === 0 ? (
            <div style={{ color: "#5A6478", fontSize: 13, padding: "24px 0" }}>
              No requests yet. Send one through the gateway to see it here.
            </div>
          ) : (
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#223049" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "#7E8AA3", fontSize: 11 }} stroke="#223049" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#E7ECF5", fontSize: 12, fontFamily: "ui-monospace, monospace" }}
                    stroke="#223049"
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{ background: "#121B2E", border: "1px solid #223049", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "#E7ECF5" }}
                    itemStyle={{ color: "#E7ECF5" }}
                  />
                  <Bar dataKey="requests" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={providerColor(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div
          style={{
            background: "#121B2E",
            border: "1px solid #223049",
            borderRadius: 10,
            padding: "16px 18px",
            flex: 1,
            minWidth: 200,
          }}
        >
          <div style={{ fontSize: 12, color: "#7E8AA3", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Cache
          </div>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 26, fontWeight: 600, color: "#6FCE8F" }}>
            {cacheStats ? cacheStats.entries : "—"}
          </div>
          <div style={{ fontSize: 12, color: "#5A6478", marginTop: 4 }}>
            live entries (max {cacheStats ? cacheStats.max_size : "—"})
          </div>
          <div style={{ borderTop: "1px solid #223049", marginTop: 14, paddingTop: 14 }}>
            {summary.map((p) => (
              <div
                key={p.provider}
                style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}
              >
                <span style={{ color: providerColor(p.provider), fontWeight: 600 }}>{p.provider}</span>
                <span style={{ color: "#7E8AA3", fontFamily: "ui-monospace, monospace" }}>
                  {formatCost(p.total_cost_usd || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent requests log */}
      <div style={{ background: "#121B2E", border: "1px solid #223049", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #223049", fontSize: 12, color: "#7E8AA3", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Recent requests
        </div>
        {recent.length === 0 ? (
          <div style={{ padding: "24px 18px", color: "#5A6478", fontSize: 13 }}>
            Nothing logged yet.
          </div>
        ) : (
          <div>
            {recent.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 18px",
                  borderLeft: `3px solid ${providerColor(r.provider)}`,
                  borderBottom: "1px solid #1A2338",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#5A6478", minWidth: 72 }}>{formatTime(r.timestamp)}</span>
                <span style={{ color: providerColor(r.provider), fontWeight: 600, minWidth: 70 }}>
                  {r.provider}
                </span>
                <span style={{ color: "#7E8AA3", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.model}
                </span>
                <span style={{ color: "#E7ECF5", minWidth: 60, textAlign: "right" }}>
                  {r.total_tokens} tok
                </span>
                <span style={{ color: "#F5A85E", minWidth: 70, textAlign: "right" }}>
                  {formatCost(r.estimated_cost_usd)}
                </span>
                <div style={{ display: "flex", gap: 6, minWidth: 130, justifyContent: "flex-end" }}>
                  {r.cache_hit === 1 && <Badge text="cached" color="#6FCE8F" />}
                  {r.fallback_used === 1 && <Badge text="fallback" color="#F5A85E" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: "#3D4557", marginTop: 16, fontFamily: "ui-monospace, monospace" }}>
        {lastUpdated ? `last updated ${lastUpdated.toLocaleTimeString()}` : ""} · costs are estimates, not billed amounts
      </div>
    </div>
  );
}