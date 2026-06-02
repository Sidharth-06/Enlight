"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useSessionStore } from "@/store/sessionStore";
import AppLayout from "@/components/shared/AppLayout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format } from "date-fns";
import { Download, Trophy, Target, TrendingUp, Clock, ChevronDown, ChevronUp, Brain, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function HistoryPage() {
  const { user } = useAuth();
  const { resetSession } = useSessionStore();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const localSessions: any[] = [];
    try {
      const saved = localStorage.getItem("interview-prep-history");
      if (saved) localSessions.push(...JSON.parse(saved));
    } catch {}

    async function loadRemote() {
      try {
        const res = await fetch("/api/sessions");
        const data = await res.json();
        const remoteSessions = (data.sessions ?? []).map((row: any) => {
          const payload = row.payload ?? {};
          return {
            ...payload,
            createdAt: payload.createdAt ?? row.created_at,
            id: payload.id ?? row.id,
          };
        });

        const merged = new Map<string, any>();
        [...remoteSessions, ...localSessions].forEach((s) => {
          const key = s.id || s.createdAt || crypto.randomUUID();
          if (!merged.has(key)) merged.set(key, s);
        });

        const next = Array.from(merged.values()).sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
        setSessions(next);
      } catch {
        setSessions(localSessions);
      }
    }

    loadRemote();
  }, []);

  const filtered = filter === "all" ? sessions : sessions.filter((s) =>
    s.profile?.preferredTypes?.some((t: string) => t.toLowerCase().includes(filter))
  );

  const chartData = sessions
    .slice(-10)
    .reverse()
    .map((s, i) => ({
      session: `S${i + 1}`,
      score: parseFloat(s.averageScore?.toFixed(1) || "0"),
      questions: s.records?.length || 0,
      date: s.createdAt ? format(new Date(s.createdAt), "MMM d") : `#${i + 1}`,
    }));

  const totalSessions = sessions.length;
  const overallAvg = sessions.length
    ? (sessions.reduce((s, r) => s + (r.averageScore || 0), 0) / sessions.length).toFixed(1)
    : "—";
  const bestScore = sessions.length
    ? Math.max(...sessions.map((s) => s.averageScore || 0)).toFixed(1)
    : "—";

  function exportSession(session: any) {
    let md = `# Interview Session — ${session.profile?.role || "Unknown"}\n`;
    md += `Date: ${session.createdAt ? format(new Date(session.createdAt), "PPP") : "Unknown"}\n`;
    md += `Avg Score: ${session.averageScore?.toFixed(1)}/10\n\n`;
    session.records?.forEach((r: any, i: number) => {
      md += `## Q${i + 1}: ${r.question?.prompt}\n`;
      md += `**Score:** ${r.feedback?.score}/10\n`;
      md += `**Answer:** ${r.answer}\n\n`;
    });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Session exported!");
  }

  return (
    <AppLayout>
      <div className="history-page">
        <motion.div className="history-header" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="history-title">Session History</h1>
            <p className="history-subtitle">Track your progress and identify areas to improve</p>
          </div>
          <button className="history-new-btn" onClick={() => { resetSession(); router.push("/dashboard"); }}>
            <Brain size={16} /> New Session
          </button>
        </motion.div>

        {/* Stats */}
        <div className="history-stats">
          {[
            { label: "Total Sessions", value: totalSessions, icon: <Target size={20} />, color: "#10b981" },
            { label: "Overall Average", value: `${overallAvg}/10`, icon: <TrendingUp size={20} />, color: "#6366f1" },
            { label: "Best Score", value: `${bestScore}/10`, icon: <Trophy size={20} />, color: "#f59e0b" },
            {
              label: "Total Questions",
              value: sessions.reduce((s, r) => s + (r.records?.length || 0), 0),
              icon: <Clock size={20} />, color: "#ef4444"
            },
          ].map(({ label, value, icon, color }) => (
            <motion.div key={label} className="history-stat-card" whileHover={{ y: -2 }}>
              <div className="history-stat-icon" style={{ color, background: `${color}15` }}>{icon}</div>
              <div>
                <div className="history-stat-value">{value}</div>
                <div className="history-stat-label">{label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Score trend chart */}
        {chartData.length >= 2 && (
          <motion.div className="history-chart-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <h3 className="chart-title">Score Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--surface-solid)", border: "1px solid var(--line)", borderRadius: "10px", fontSize: "13px" }}
                  labelStyle={{ color: "var(--muted)" }}
                />
                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ fill: "#10b981", r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Filter */}
        <div className="history-filters">
          {["all", "coding", "behavioral", "hr", "system"].map((f) => (
            <button key={f} className={`filter-chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "coding" ? "Coding" : f === "behavioral" ? "Behavioral" : f === "hr" ? "HR" : "System Design"}
            </button>
          ))}
        </div>

        {/* Sessions list */}
        {filtered.length === 0 ? (
          <div className="history-empty">
            <div className="history-empty-icon"><Brain size={40} /></div>
            <h3>No sessions yet</h3>
            <p>Complete your first interview session to see history here.</p>
            <button className="history-new-btn" onClick={() => { resetSession(); router.push("/dashboard"); }}>
              Start Practicing
            </button>
          </div>
        ) : (
          <div className="history-sessions">
            {filtered.map((session, i) => {
              const id = `${i}-${session.createdAt}`;
              const isExpanded = expandedId === id;
              const avg = session.averageScore?.toFixed(1) || "0";
              const scoreC = Number(avg) >= 8 ? "#10b981" : Number(avg) >= 5 ? "#f59e0b" : "#ef4444";

              return (
                <motion.div key={id} className="history-session-card" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <div className="history-session-header" onClick={() => setExpandedId(isExpanded ? null : id)}>
                    <div className="history-session-info">
                      <div className="history-session-role">{session.profile?.role || "Unknown Role"}</div>
                      <div className="history-session-meta">
                        <span>{session.createdAt ? format(new Date(session.createdAt), "MMM d, yyyy") : "Unknown date"}</span>
                        <span>·</span>
                        <span>{session.records?.length || 0} questions</span>
                        <span>·</span>
                        <span>{session.profile?.difficulty}</span>
                      </div>
                    </div>
                    <div className="history-session-right">
                      <div className="history-score-badge" style={{ color: scoreC, borderColor: `${scoreC}30`, background: `${scoreC}10` }}>
                        {avg}/10
                      </div>
                      <button className="history-export-btn" onClick={(e) => { e.stopPropagation(); exportSession(session); }}>
                        <Download size={14} />
                      </button>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  <AnimatePresenceWrapper show={isExpanded}>
                    <div className="history-session-detail">
                      {session.records?.map((r: any, qi: number) => (
                        <div key={qi} className="history-question-row">
                          <div className="history-q-num">Q{qi + 1}</div>
                          <div className="history-q-info">
                            <div className="history-q-prompt">{r.question?.prompt?.slice(0, 100)}...</div>
                            <div className="history-q-type">{r.question?.type?.replace("_", " ")} · {r.question?.difficulty}</div>
                          </div>
                          <div className="history-q-score" style={{ color: r.feedback?.score >= 7 ? "#10b981" : r.feedback?.score >= 5 ? "#f59e0b" : "#ef4444" }}>
                            {r.feedback?.score}/10
                          </div>
                        </div>
                      ))}
                    </div>
                  </AnimatePresenceWrapper>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function AnimatePresenceWrapper({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ height: show ? "auto" : 0, opacity: show ? 1 : 0 }}
      transition={{ duration: 0.2 }}
      style={{ overflow: "hidden" }}
    >
      {children}
    </motion.div>
  );
}
